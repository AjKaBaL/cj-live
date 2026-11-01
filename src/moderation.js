// CJ LIVE — por AjKaBaL
// Moderação automática do chat: quem fala palavrão/ofensa ou faz spam leva "falta".
// 1ª falta: o CJ só ignora. 2ª: o CJ dá um toque em voz alta. 3ª: fica de castigo (o CJ não responde
// mais, some do overlay) e entra na lista "para banir" do menu Moderação — o ban em si é feito no app do TikTok.

const fs = require('fs');
const path = require('path');
const { normalize, PARTS, WORDS } = require('./names');

// Ofensas comuns além dos palavrões (mesma normalização: sem acento, z→s, k→c, letras repetidas uma vez)
const INSULTS = [
    'otari', 'idiot', 'imbecil', 'retardad', 'arombad', 'vagabund', 'desgrac', 'filhodaput', 'vtnc', 'vaitomarno',
    'seulix', 'lixohuman', 'seumacac', 'babac', 'escrot', 'corno', 'cornao', 'safad', 'piranh', 'vadia', 'nojent',
];

function createModeration(cfg = {}, dataDir) {
    const file = path.join(dataDir, 'moderacao.json');
    let list = {};
    try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* ainda não existe */ }
    const parts = [...PARTS, ...INSULTS, ...(cfg.extraWords || []).map((w) => normalize(w).replace(/ /g, ''))];
    const words = new Set(WORDS.map(normalize));
    const recent = new Map(); // usuário -> { faltas: [horas], msgs: [{ text, at }] }
    const windowMs = (cfg.strikeWindowMin ?? 30) * 60000;
    const strikesToMute = cfg.strikesToMute ?? 3;

    const save = () => {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFile(file, JSON.stringify(list, null, 1), () => {});
    };

    function isOffensive(text) {
        const norm = normalize(text);
        const joined = norm.replace(/ /g, '');
        return parts.some((p) => p && joined.includes(p)) || norm.split(' ').some((w) => words.has(w));
    }

    // Retorna 'ok' (segue normal), 'ignore' (não responde), 'warn' (o CJ dá um toque) ou 'mute' (castigo agora)
    function check(user, comment) {
        const id = user?.uniqueId || '?';
        if (list[id]?.muted) return 'ignore';
        const now = Date.now();
        const state = recent.get(id) || { strikes: [], msgs: [] };
        recent.set(id, state);

        // Spam: a mesma mensagem várias vezes em 1 minuto
        const norm = normalize(comment).trim();
        state.msgs = state.msgs.filter((m) => now - m.at < 60000);
        state.msgs.push({ text: norm, at: now });
        const repeats = state.msgs.filter((m) => m.text === norm).length;
        const spam = repeats === (cfg.spamRepeats ?? 4);

        if (!spam && !isOffensive(comment)) return repeats > 1 ? 'ignore' : 'ok';

        state.strikes = state.strikes.filter((at) => now - at < windowMs);
        state.strikes.push(now);
        const strikes = state.strikes.length;
        const entry = list[id] || { name: user?.nickname || id, strikes: 0, muted: false, messages: [] };
        entry.name = user?.nickname || entry.name;
        entry.strikes = strikes;
        entry.messages = [...entry.messages, comment].slice(-3);
        entry.at = new Date().toLocaleString('pt-BR');
        if (strikes >= strikesToMute) entry.muted = true;
        if (strikes >= 2) { list[id] = entry; save(); }
        return strikes >= strikesToMute ? 'mute' : strikes === strikesToMute - 1 ? 'warn' : 'ignore';
    }

    const isMuted = (user) => !!list[user?.uniqueId]?.muted;
    return { check, isMuted };
}

module.exports = { createModeration };
