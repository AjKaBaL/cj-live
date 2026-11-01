// CJ LIVE — por AjKaBaL
// Voz do CJ com RVC (Applio): converte o áudio do TTS para o timbre do CJ.
// Sobe um worker Python que mantém o modelo carregado; se ele não estiver pronto ou falhar,
// a fala sai com a voz normal do TTS (a live nunca fica muda).

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function createRvc(cfg) {
    if (!cfg?.enabled) return null;
    let worker = null;
    let ready = false;
    let seq = 0;
    const waiting = new Map(); // id -> { resolve, timer }

    function start(warmupFile) {
        const env = {
            ...process.env,
            CJ_RVC_MODEL: cfg.model,
            CJ_RVC_INDEX: cfg.index || '',
            CJ_RVC_PITCH: String(cfg.pitch ?? 0),
            CJ_RVC_INDEX_RATE: String(cfg.indexRate ?? 0.5),
            CJ_RVC_PROTECT: String(cfg.protect ?? 0.33),
            CJ_RVC_VOLUME_ENVELOPE: String(cfg.volumeEnvelope ?? 1.0),
            CJ_RVC_WARMUP: warmupFile || '',
            PYTHONIOENCODING: 'utf-8',
        };
        // "cpu": não usa a placa de vídeo (mais lento, ~5s por fala, mas não disputa memória com o GTA)
        if (cfg.device === 'cpu') env.CUDA_VISIBLE_DEVICES = '-1';
        worker = spawn(cfg.python, [path.join(__dirname, '..', 'voice-rvc', 'rvc_worker.py')], {
            cwd: cfg.applioDir, env, windowsHide: true,
        });
        let buf = '';
        worker.stdout.on('data', (chunk) => {
            buf += chunk;
            let nl;
            while ((nl = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, nl).trim();
                buf = buf.slice(nl + 1);
                if (!line.startsWith('@@CJ@@ ')) continue;
                const msg = JSON.parse(line.slice(7));
                if ('ready' in msg) {
                    ready = msg.ready;
                    if (warmupFile) fs.rm(warmupFile, { force: true }, () => {});
                    console.log(ready ? `   🎙️  Voz do CJ (RVC) pronta [${msg.device}]` : `   (voz do CJ falhou: ${msg.error})`);
                    continue;
                }
                const job = waiting.get(msg.id);
                if (!job) continue;
                waiting.delete(msg.id);
                clearTimeout(job.timer);
                job.resolve(msg.ok);
            }
        });
        worker.stderr.on('data', () => {}); // logs/avisos do torch
        worker.on('exit', (code) => {
            ready = false;
            worker = null;
            for (const job of waiting.values()) { clearTimeout(job.timer); job.resolve(false); }
            waiting.clear();
            console.warn(`   (voz do CJ parou, código ${code}; usando a voz normal)`);
        });
    }

    // Converte; resolve com o caminho do .wav, ou null para usar o áudio original
    function convert(inputFile) {
        if (!worker) start();
        if (!ready) return Promise.resolve(null);
        const id = ++seq;
        const output = inputFile.replace(/\.\w+$/, '.cj.wav');
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                waiting.delete(id);
                resolve(null);
            }, cfg.timeoutMs || 10000);
            waiting.set(id, { resolve: (ok) => resolve(ok && fs.existsSync(output) ? output : null), timer });
            worker.stdin.write(JSON.stringify({ id, input: inputFile, output }) + '\n');
        });
    }

    return { convert, start: (warmupFile) => { if (!worker) start(warmupFile); }, get ready() { return ready; } };
}

// Duração de um .wav PCM pelo cabeçalho
function wavDurationMs(file) {
    const b = fs.readFileSync(file);
    let o = 12, byteRate = 0, dataSize = 0;
    while (o + 8 <= b.length) {
        const id = b.toString('ascii', o, o + 4);
        const size = b.readUInt32LE(o + 4);
        if (id === 'fmt ') byteRate = b.readUInt32LE(o + 16);
        if (id === 'data') { dataSize = size; break; }
        o += 8 + size + (size & 1);
    }
    return byteRate ? Math.round((dataSize * 1000) / byteRate) : 0;
}

module.exports = { createRvc, wavDurationMs };
