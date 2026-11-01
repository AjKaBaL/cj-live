// CJ LIVE — por AjKaBaL
// "Cérebro" do CJ: gera as falas com o Gemini (plano grátis) usando a persona em persona/cj.md.
// Sem chave ou se a API falhar, usa falas prontas para a live nunca ficar muda.

const fs = require('fs');
const path = require('path');

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const FALLBACK = {
    gift: [
        'Aí, {user}! Valeu pela moral, parceiro! Agora você tá fechado comigo!',
        'Na moral, {user}, valeu pelo {gift}! A Grove Street agradece!',
    ],
    bigGift: [
        'CARACA, {user}! Com esse {gift} dá pra tunar o carro e fugir da polícia!',
        'NÃO ACREDITO, {user}! Missão desbloqueada, parceiro!',
    ],
    chat: [
        'Fechou, {user}! Tamo junto na missão!',
        'Aí, {user}, tô ligado, parceiro!',
    ],
    game: {
        policia: ['Ah não, de novo não! A polícia tá na minha cola!', 'Sujou! É os home, parceiro, segura!'],
        despistou: ['Despistei os home! Tranquilo, tranquilo.', 'Ninguém pega o CJ, parceiro!'],
        atacado: ['Aí, tá maluco? Quem mandou isso?', 'Ei, ei! Tá querendo morrer, mano?'],
        tiroteio: ['Abaixa, galera! Tão atirando!', 'Ah, droga, tiroteio de novo!'],
        explosao: ['CARACA! Quase que eu vou junto!', 'Que isso, mano? Tá tudo explodindo!'],
        bateu: ['Ai, ai, meu carro! Quem ensinou esse povo a dirigir?', 'Foi mal, foi mal! Tava com pressa!'],
        caiu: ['Ai! Tô ficando velho pra isso, parceiro.', 'Tô de boa, tô de boa... acho.'],
        default: ['Ah, sempre sobra pro CJ!'],
    },
    follow: [
        'Aí, {user}! Bem-vindo à Grove Street, parceiro!',
        'Mais um na gangue! Valeu, {user}!',
    ],
    announce: [
        'MISSÃO CUMPRIDA, galera! Respeito pra Grove Street!',
        'Aí sim! A gangue completou a missão, parceiro!',
    ],
};

function pick(list, vars) {
    const line = list[Math.floor(Math.random() * list.length)];
    return line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function createBrain(aiConfig, apiKey) {
    const persona = fs.readFileSync(path.join(__dirname, '..', 'persona', 'cj.md'), 'utf8');
    const history = [];

    function remember(role, text) {
        history.push({ role, parts: [{ text }] });
        while (history.length > aiConfig.historySize) history.shift();
        // A conversa no Gemini precisa começar com a vez do "user"
        while (history.length && history[0].role !== 'user') history.shift();
    }

    function clean(text) {
        let out = text.replace(/[*_#`"“”]/g, '').replace(/\s+/g, ' ').trim();
        if (out.length > aiConfig.maxChars) {
            const cut = out.slice(0, aiConfig.maxChars);
            const end = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
            out = end > 40 ? cut.slice(0, end + 1) : cut;
        }
        return out;
    }

    // Modelo que falhou fica de castigo um tempo: não gasta a espera da live tentando ele de novo
    const benchedUntil = new Map();
    const MODEL_TIMEOUT_MS = aiConfig.modelTimeoutMs || 4000;
    const TOTAL_TIMEOUT_MS = aiConfig.totalTimeoutMs || 9000;
    const BENCH_MS = 60_000;

    // Tenta os modelos em ordem: se um estiver sobrecarregado ou lento, passa para o próximo,
    // mas desiste de tudo depois de TOTAL_TIMEOUT_MS (aí entra a fala pronta)
    async function ask(prompt) {
        if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');
        const errors = [];
        const deadline = Date.now() + TOTAL_TIMEOUT_MS;
        const now = Date.now();
        const models = aiConfig.models.filter((m) => !(benchedUntil.get(m) > now));
        for (const model of models.length ? models : aiConfig.models) {
            const left = deadline - Date.now();
            if (left < 800) break;
            try {
                return await askModel(model, prompt, Math.min(MODEL_TIMEOUT_MS, left));
            } catch (err) {
                benchedUntil.set(model, Date.now() + BENCH_MS);
                errors.push(`${model}: ${err.message}`);
            }
        }
        throw new Error(errors.join(' | ') || 'tempo esgotado');
    }

    async function askModel(model, prompt, timeoutMs) {
        const res = await fetch(`${API_URL}/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: persona }] },
                contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
                // "minimal" desliga quase todo o raciocínio: a resposta cai de ~7s para ~1,5s
                generationConfig: { temperature: aiConfig.temperature, maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: 'minimal' } },
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(`${res.status} ${body.error?.status || ''}`.trim());
        }
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
        if (!text.trim()) throw new Error(`resposta vazia (${data.candidates?.[0]?.finishReason || 'sem motivo'})`);
        remember('user', prompt);
        remember('model', text);
        return clean(text);
    }

    async function withFallback(prompt, fallbackList, vars) {
        try {
            return await ask(prompt);
        } catch (err) {
            console.warn(`   (IA indisponível: ${err.message} — usando fala pronta)`);
            return pick(fallbackList, vars);
        }
    }

    return {
        replyToChat(user, comment) {
            return withFallback(
                `[CHAT] ${user} escreveu: ${comment}\nResponda como CJ, falando com ${user}.`,
                FALLBACK.chat, { user });
        },
        reactToGift(user, giftName, count, diamonds, isBig, actionLabel) {
            const effect = actionLabel ? ` No jogo, isso vai fazer: ${actionLabel}. Comente o que vai acontecer.` : '';
            return withFallback(
                `[PRESENTE] ${user} enviou ${count}x ${giftName} (${diamonds} diamantes${isBig ? ', presente GRANDE' : ''}). Agradeça como CJ.${effect}`,
                isBig ? FALLBACK.bigGift : FALLBACK.gift, { user, gift: giftName });
        },
        reactToGame(kind, text) {
            return withFallback(
                `[NO JOGO] ${text}. Reaja na hora como CJ, curto e no calor do momento, sem palavrão (a live é do TikTok).`,
                FALLBACK.game[kind] || FALLBACK.game.default, {});
        },
        welcomeFollower(user) {
            return withFallback(
                `[SEGUIDOR] ${user} acabou de seguir a live. Dê as boas-vindas à gangue como CJ, bem curto.`,
                FALLBACK.follow, { user });
        },
        announce(event) {
            return withFallback(`[EVENTO DA LIVE] ${event}. Anuncie isso como CJ, empolgado.`, FALLBACK.announce, {});
        },
    };
}

module.exports = { createBrain };
