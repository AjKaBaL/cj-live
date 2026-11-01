// CJ LIVE — por AjKaBaL
// Voz do CJ: gera o áudio com o Edge TTS (grátis), passa pelo RVC (timbre do CJ) quando
// está ligado e toca uma fala de cada vez, em fila. onStart/onEnd mexem a boca e a legenda.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { createRvc, wavDurationMs } = require('./rvc');

const AUDIO_DIR = path.join(__dirname, '..', 'audio');
const BITRATE = 48_000; // AUDIO_24KHZ_48KBITRATE_MONO_MP3, taxa constante

// Duração de um .mp3 de taxa constante: pula a tag ID3 e lê a taxa no cabeçalho do 1º quadro
function mp3DurationMs(file) {
    const b = fs.readFileSync(file);
    let o = b.toString('latin1', 0, 3) === 'ID3' ? 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]) : 0;
    while (o + 4 < b.length && !(b[o] === 0xff && (b[o + 1] & 0xe0) === 0xe0)) o++;
    const mpeg1 = (b[o + 1] & 0x18) === 0x18;
    const kbps = (mpeg1 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
        : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160])[b[o + 2] >> 4];
    return kbps ? Math.round(((b.length - o) * 8) / kbps) : 3000;
}

function playOnWindows(file, durationMs) {
    const script = [
        'Add-Type -AssemblyName PresentationCore',
        '$p = New-Object System.Windows.Media.MediaPlayer',
        `$p.Open([Uri]'${file.replace(/'/g, "''")}')`,
        '$p.Play()',
        `Start-Sleep -Milliseconds ${durationMs + 400}`,
        '$p.Close()',
    ].join('; ');
    return new Promise((resolve) => {
        spawn('powershell', ['-NoProfile', '-Command', script], { stdio: 'ignore', windowsHide: true })
            .on('exit', resolve)
            .on('error', resolve);
    });
}

function createVoice(voiceConfig, { onStart = () => {}, onEnd = () => {} } = {}) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    const queue = [];
    const rvc = createRvc(voiceConfig.rvc);
    let busy = false;
    let counter = 0;
    const ttsByVoice = new Map(); // uma conexão por voz (português e a das falas icônicas em inglês)

    async function getTTS(name) {
        if (!ttsByVoice.has(name)) {
            const tts = new MsEdgeTTS();
            await tts.setMetadata(name, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
            ttsByVoice.set(name, tts);
        }
        return ttsByVoice.get(name);
    }

    // style: { name, rate, pitch } de outra voz (ex.: falas icônicas em inglês); padrão = a do config
    async function tts2mp3(text, style = voiceConfig) {
        const file = path.join(AUDIO_DIR, `fala-${Date.now()}-${counter++}.mp3`);
        try {
            const { audioStream } = (await getTTS(style.name)).toStream(text, { rate: style.rate, pitch: style.pitch });
            await new Promise((resolve, reject) => {
                const out = fs.createWriteStream(file);
                audioStream.on('error', reject);
                out.on('finish', resolve).on('error', reject);
                audioStream.pipe(out);
            });
        } catch (err) {
            ttsByVoice.delete(style.name); // força reconectar na próxima fala
            throw err;
        }
        return file;
    }

    // Áudio pronto para tocar: o do CJ (RVC) se der, senão o do TTS
    async function synthesize(text, style) {
        const mp3 = await tts2mp3(text, style);
        const wav = rvc ? await rvc.convert(mp3) : null;
        if (wav) {
            fs.rm(mp3, { force: true }, () => {});
            return { file: wav, durationMs: wavDurationMs(wav) };
        }
        return { file: mp3, durationMs: Math.round((fs.statSync(mp3).size * 8 * 1000) / BITRATE) };
    }

    // Áudio pronto (fala original do jogo): toca direto, sem TTS nem RVC, e não é apagado depois
    function original(file) {
        const durationMs = /\.wav$/i.test(file) ? wavDurationMs(file) : mp3DurationMs(file);
        return Promise.resolve({ file, durationMs, keep: true });
    }

    const prepare = (item) => {
        if (!item.prepared) item.prepared = item.file ? original(item.file) : synthesize(item.text, item.style).catch((err) => ({ error: err }));
        return item.prepared;
    };

    async function next() {
        if (busy || !queue.length) return;
        busy = true;
        const item = queue.shift();
        const audio = await prepare(item);
        if (audio.error) {
            console.error(`   (erro na voz: ${audio.error.message})`);
        } else {
            // Já vai preparando a próxima fala enquanto esta toca (esconde o tempo do RVC)
            if (queue[0]) prepare(queue[0]);
            onStart({ text: item.text, file: audio.file, durationMs: audio.durationMs, meta: item.meta });
            if (voiceConfig.playLocal) await playOnWindows(audio.file, audio.durationMs);
            else await new Promise((r) => setTimeout(r, audio.durationMs));
            onEnd({ text: item.text });
            if (!audio.keep) fs.rm(audio.file, { force: true }, () => {});
        }
        busy = false;
        next();
    }

    function discard(item) {
        if (item.prepared) item.prepared.then((a) => a.file && !a.keep && fs.rm(a.file, { force: true }, () => {}));
    }

    // priority: 2 = presente grande, 1 = presente/evento, 0 = chat
    // file: áudio pronto para tocar no lugar do TTS (as falas originais do CJ)
    // meta: quem/o que gerou a fala (vai para o card de resposta do overlay)
    function say(text, priority = 0, { style, file, meta } = {}) {
        if (!text) return;
        queue.push({ text, priority, style, file, meta });
        queue.sort((a, b) => b.priority - a.priority);
        // Fila cheia: descarta as falas de menor prioridade (as do chat vão primeiro)
        while (queue.length > voiceConfig.maxQueue) discard(queue.pop());
        next();
    }

    // Sobe o RVC já aquecido com uma fala curta, para a primeira fala da live não demorar
    if (rvc) tts2mp3('Aí, parceiro.').then((warm) => rvc.start(warm)).catch(() => rvc.start());

    return { say, get pending() { return queue.length + (busy ? 1 : 0); } };
}

module.exports = { createVoice };
