// CJ LIVE — por AjKaBaL
// Separa as falas originais do CJ (extraídas do San Andreas e transcritas) por momento da live:
// "engasga" os palavrões (corta a palavra logo no começo, como se ele segurasse o xingamento), descarta
// ofensa preconceituosa/sexual, pede para a IA (Gemini, chave do .env) dizer em que momento cada uma combina
// e grava os .wav em falas-originais/<momento>/, com a frase como nome do arquivo (vira a legenda).
// Uso: node tools/sa-separar.js <transcricoes.json> <pasta dos .wav>

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch { /* sem .env */ }
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const [jsonFile, wavDir] = process.argv.slice(2);
const OUT = path.join(ROOT, 'falas-originais');

// Momentos (pastas) e quando cada um toca — o nome da pasta é o "kind" do evento no index.js
const MOMENTS = {
    policia: 'a polícia começou a perseguir o CJ',
    despistou: 'o CJ despistou/fugiu da polícia',
    atacado: 'alguém bateu ou atirou no CJ / provocação a quem atacou',
    tiroteio: 'tiroteio perto do CJ',
    explosao: 'algo explodiu perto',
    bateu: 'o CJ bateu o carro / alguém bateu no carro dele',
    caiu: 'o CJ caiu, foi atropelado, se machucou (dor, susto)',
    briga: 'o CJ arrumou briga na rua / provocando alguém para brigar',
    manobra: 'o CJ fez manobra com carro ou moto (zerinho, rampa, velocidade)',
    vandalismo: 'o CJ destruiu um carro',
    tiro_pro_alto: 'o CJ comemorando ou se exibindo',
    'presente-grande': 'comemoração grande, empolgação, "isso aí!"',
    missao: 'missão cumprida, vitória, respeito',
    seguidor: 'cumprimentar alguém que chegou (oi, e aí, salve)',
    aleatorio: 'fala solta enquanto anda pela cidade: comentário, gíria da Grove, chamar alguém, reclamar da vida',
};

// Ofensa preconceituosa, sexual ou ameaça: a fala inteira fica de fora
const BLOCKED = /\b(nigg\w*|pussy|dick\w*|cock\w*|cunt|whore\w*|slut\w*|hoe?s?|fag\w*|gay|crack\w*|tits?|titties|sex\w*|cum|retard\w*|pimp\w*|kill(ed|ing)? (you|yo)|murder\w*|dead)\b/i;
// Palavrão "fuck" e derivados: ele "engasga" bem no "fu—" e a fala continua (bitch, ass, shit, damn ficam inteiros)
const SWEAR = /(fuck|fuc?kin|mutha)/i;
const bare = (word) => word.replace(/^[\W_]+|[\W_]+$/g, '');
const isSwear = (word) => SWEAR.test(bare(word));
// onde começa o "fu" dentro da palavra (motherfucker → depois do "mother")
const fuIndex = (word) => Math.max(0, bare(word).toLowerCase().search(/fu|fa|mutha/));

async function ask(prompt) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Sem GEMINI_API_KEY no .env');
    for (const model of config.ai.models) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'minimal' } },
                }),
            });
            if (!res.ok) continue;
            const data = await res.json();
            return JSON.parse(data.candidates[0].content.parts.map((p) => p.text).join(''));
        } catch { /* tenta o próximo modelo */ }
    }
    throw new Error('Nenhum modelo do Gemini respondeu');
}

const fileName = (text) => text.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);

// Lê um .wav PCM 16 bits mono (como o sa-audio.js grava)
function readWav(file) {
    const buf = fs.readFileSync(file);
    const dataAt = buf.indexOf('data') + 8;
    return { rate: buf.readUInt32LE(24), header: buf.subarray(0, dataAt), pcm: buf.subarray(dataAt) };
}

// Engasga cada palavrão no "fu—": deixa a palavra até o "fu" sumindo, uma pausa curta e segue a frase
// cuts: [início, fim, fração da palavra onde começa o "fu"]
function choke(file, cuts) {
    const { rate, header, pcm } = readWav(file);
    const samples = new Int16Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.length));
    const at = (sec) => Math.max(0, Math.min(samples.length, Math.round(sec * rate)));
    const parts = [];
    let pos = 0;
    for (const [start, end, fu] of cuts) {
        const cutAt = start + fu * (end - start) + 0.09;
        const s = at(cutAt - 0.04), keep = at(cutAt), e = at(end + 0.04);
        parts.push(samples.slice(pos, s));
        const head = samples.slice(s, keep);
        for (let i = 0; i < head.length; i++) head[i] = Math.round(head[i] * (1 - i / head.length));
        parts.push(head, new Int16Array(Math.round(rate * 0.12)));
        pos = Math.max(pos, e);
    }
    parts.push(samples.slice(pos));
    const out = Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)));
    const h = Buffer.from(header);
    h.writeUInt32LE(36 + out.length, 4);
    h.writeUInt32LE(out.length, h.length - 4);
    return Buffer.concat([h, out]);
}

// Prepara a fala: { text (legenda), cuts (trechos a engasgar) } ou null se não presta
function prepare(entry) {
    const text = typeof entry === 'string' ? entry : entry.text;
    const words = typeof entry === 'string' ? [] : entry.words || [];
    if (!text || BLOCKED.test(text) || /(\w)\1{4}|(\b\w+\b)(\W+\2\b){3}/i.test(text)) return null;
    const swears = text.split(/\s+/).filter(isSwear);
    if (!swears.length) return { text, cuts: [] };
    // precisa achar cada palavrão com o tempo no áudio, senão ia sair o xingamento inteiro
    const cuts = words.filter(([w]) => isSwear(w));
    if (cuts.length !== swears.length || cuts.some(([, s, e]) => s == null || e == null)) return null;
    // legenda: "motherfucker!" → "motherfu—!"
    const clean = text.split(/\s+/).map((w) => {
        if (!isSwear(w)) return w;
        const b = bare(w);
        return `${w.slice(0, w.indexOf(b))}${b.slice(0, fuIndex(w) + 2)}—${w.match(/[!?.,]+$/)?.[0] || ''}`;
    }).join(' ');
    // só sobrou o palavrão (ex.: "Fu—!") = não vale a pena
    if (!clean.split(/\s+/).some((w) => !w.includes('—') && /[a-z]{2}/i.test(w))) return null;
    return { text: clean, cuts: cuts.map(([w, s, e]) => [s, e, fuIndex(w) / (bare(w).length || 1)]) };
}

if (require.main !== module) { module.exports = { prepare, choke }; return; }

(async () => {
    const lines = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    // A mesma frase aparece em várias gravações: guarda até 2 de cada (soam diferentes)
    const seen = {};
    const clean = [];
    let choked = 0;
    for (const [file, entry] of Object.entries(lines)) {
        const line = prepare(entry);
        if (!line) continue;
        const key = line.text.toLowerCase().replace(/[^a-z ]/g, '').trim();
        if (key.length < 4 || (seen[key] || 0) >= 2) continue;
        seen[key] = (seen[key] || 0) + 1;
        if (line.cuts.length) choked++;
        clean.push({ file, ...line });
    }
    console.log(`${Object.keys(lines).length} falas, ${clean.length} aproveitáveis (${choked} com palavrão engasgado)`);

    const moments = Object.entries(MOMENTS).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    const picked = {};
    for (let i = 0; i < clean.length; i += 120) {
        const chunk = clean.slice(i, i + 120);
        const list = chunk.map(({ text }, n) => `${n}: ${text}`).join('\n');
        let answer = {};
        try {
            answer = await ask(`Você vai organizar falas do CJ (GTA San Andreas) para uma live de TikTok.
Onde aparece "fu—" ele começou a xingar e engasgou a palavra (isso é engraçado, pode aproveitar).
Para cada fala, diga até 2 momentos em que ela combina bem (o melhor primeiro), ou [] se não combinar,
se for ofensiva, preconceituosa, sexual, violenta demais contra pessoas, ou sem sentido (erro de transcrição).
Falas genéricas mas legais (gíria, comentário, reclamação) vão em "aleatorio".
Momentos:
${moments}

Responda só JSON: {"<número>": ["<momento>", ...], ...}

Falas:
${list}`);
        } catch (err) { console.log(`  lote ${i} pulado: ${err.message}`); }
        chunk.forEach((line, n) => {
            const got = [].concat(answer[String(n)] || []).filter((m) => MOMENTS[m]).slice(0, 2);
            for (const moment of new Set(got)) (picked[moment] = picked[moment] || []).push(line);
        });
        console.log(`${Math.min(i + 120, clean.length)}/${clean.length} classificadas`);
    }

    let total = 0;
    for (const [moment, list] of Object.entries(picked)) {
        const dir = path.join(OUT, moment);
        fs.mkdirSync(dir, { recursive: true });
        for (const { file, text, cuts } of list) {
            // 2ª gravação da mesma frase vira "frase (2).wav" (a legenda continua só a frase)
            let dest = path.join(dir, `${fileName(text)}.wav`);
            if (fs.existsSync(dest)) dest = path.join(dir, `${fileName(text)} (2).wav`);
            if (fs.existsSync(dest)) continue;
            const src = path.join(wavDir, file);
            if (cuts.length) fs.writeFileSync(dest, choke(src, cuts));
            else fs.copyFileSync(src, dest);
            total++;
        }
        console.log(`  ${moment}: ${list.length}`);
    }
    console.log(`${total} falas novas em falas-originais/`);
})();
