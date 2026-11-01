// CJ LIVE — por AjKaBaL
// Decide quais mensagens do chat o CJ responde, seguindo as regras do config.json.

function createChatFilter(rules) {
    const lastReplyByUser = new Map();
    const recentReplies = [];
    const ignorePatterns = rules.ignorePatterns.map((p) => new RegExp(p, 'i'));
    const ignoreUsers = new Set(rules.ignoreUsers.map((u) => u.toLowerCase().replace(/^@/, '')));

    // Retorna { reply: boolean, reason: string }
    return function check({ uniqueId, comment, isGifter }) {
        const text = (comment || '').trim();
        const lower = text.toLowerCase();
        const now = Date.now();

        if (ignoreUsers.has((uniqueId || '').toLowerCase())) return { reply: false, reason: 'usuário ignorado' };
        if (text.length < rules.minLength) return { reply: false, reason: 'curta demais' };
        if (ignorePatterns.some((re) => re.test(text))) return { reply: false, reason: 'padrão ignorado' };
        if (rules.blockedWords.some((w) => lower.includes(w.toLowerCase()))) return { reply: false, reason: 'palavra bloqueada' };

        const last = lastReplyByUser.get(uniqueId) || 0;
        if (now - last < rules.userCooldownSec * 1000) return { reply: false, reason: 'cooldown do usuário' };

        while (recentReplies.length && now - recentReplies[0] > 60_000) recentReplies.shift();
        if (recentReplies.length >= rules.maxRepliesPerMinute) return { reply: false, reason: 'limite por minuto' };

        const mentions = rules.alwaysReplyIfMentions.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(text));
        const question = rules.alwaysReplyToQuestions && text.includes('?');
        const lucky = Math.random() < rules.replyChance;
        if (!(mentions || question || isGifter || lucky)) return { reply: false, reason: 'sorteio' };

        lastReplyByUser.set(uniqueId, now);
        recentReplies.push(now);
        return { reply: true, reason: mentions ? 'mencionou' : question ? 'pergunta' : isGifter ? 'apoiador' : 'sorteio' };
    };
}

module.exports = { createChatFilter };
