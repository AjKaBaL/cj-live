// CJ LIVE — por AjKaBaL
// Conecta na LIVE do TikTok, decide o que responder, gera a fala com IA + voz
// e transmite tudo via WebSocket (overlay do OBS e, depois, o mod do GTA).
// Uso: node index.js <usuario>      (live real)
//      node index.js --sim          (simulador: digite eventos no console)

const fs = require('fs');
const path = require('path');
const http = require('http');
const readline = require('readline');
const { WebSocketServer } = require('ws');
const { createChatFilter } = require('./src/filter');
const { createBrain } = require('./src/brain');
const { createVoice } = require('./src/voice');
const { createScreenshots } = require('./src/screenshot');
const { createNameCheck } = require('./src/names');
const { createModeration } = require('./src/moderation');

try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* .env opcional */ }

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const simMode = process.argv.includes('--sim');
const username = (process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.TIKTOK_USER || '').replace(/^@/, '');
if (!simMode && !username) {
    console.error('Informe o usuário: node index.js <usuario>   (ou node index.js --sim para testar)');
    process.exit(1);
}

const RECONNECT_DELAY_MS = 10_000;
const WS_PORT = 8080;

// ---------- Servidor: overlay (http://localhost:8080) + WebSocket (overlay / mod do GTA) ----------
const OVERLAY_DIR = path.join(__dirname, 'overlay');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(OVERLAY_DIR, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(OVERLAY_DIR)) return res.writeHead(403).end();
    fs.readFile(file, (err, data) => {
        if (err) return res.writeHead(404).end('Não encontrado');
        res.writeHead(200, { 'Content-Type': `${MIME[path.extname(file)] || 'application/octet-stream'}; charset=utf-8` }).end(data);
    });
});
const wss = new WebSocketServer({ server });
wss.on('connection', (client, req) => {
    client.send(JSON.stringify({ type: 'init', payload: overlayState() }));
    // Comandos do menu "Ligar CJ LIVE" (testar presentes, resetar missões): só deste computador
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    // O mod do GTA manda o que está acontecendo no jogo (polícia, tiroteio, batida...)
    client.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (msg.type === 'game_event' && msg.payload) handleGameEvent(msg.payload);
        if (msg.type === 'admin' && local) handleAdmin(msg.payload || {});
    });
});
server.listen(WS_PORT);

function broadcast(type, payload) {
    const data = JSON.stringify({ type, payload });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(data);
    });
}

// ---------- Módulos ----------
const DATA_DIR = path.join(__dirname, 'data');
const screenshots = createScreenshots(config.screenshots);
const moderation = createModeration(config.moderation, DATA_DIR);
const time = () => new Date().toLocaleTimeString('pt-BR');
const checkChat = createChatFilter(config.chat);
const brain = createBrain(config.ai, process.env.GEMINI_API_KEY);
const voice = createVoice(config.voice, {
    onStart: ({ text, durationMs, meta }) => {
        console.log(`[${time()}] 🗣️  CJ: ${text}`);
        broadcast('speak_start', { text, durationMs, ...meta });
    },
    onEnd: () => broadcast('speak_end', {}),
});

// A biblioteca entrega o formato "v3" do TikTok (displayId, avatarThumb...); aceita também o antigo
function normUser(u = {}) {
    return cleanUser({
        uniqueId: u.displayId || u.uniqueId || u.idStr || u.id || '?',
        nickname: u.nickname || u.displayId || u.uniqueId || 'Anônimo',
        avatar: u.avatarThumb?.urlList?.[0] || u.profilePicture?.urls?.[0] || null,
    });
}

// Nome pegadinha de duplo sentido ("Kemel Pinto"...): o CJ não fala e o overlay não mostra; vira "Parceiro"
const isNaughtyName = createNameCheck(config.chat.blockedNameParts || []);
function cleanUser(user) {
    if (!isNaughtyName(user.nickname, user.uniqueId)) return user;
    console.log(`[${time()}] 🙊 Nome bloqueado: ${user.nickname} (@${user.uniqueId})`);
    return { ...user, nickname: 'Parceiro', masked: true };
}

// Nome falável: tira emojis e símbolos que a voz leria de forma estranha
const speakName = (user) => (user?.nickname || user?.uniqueId || 'parceiro').replace(/[^\p{L}\p{N} ]/gu, '').trim() || 'parceiro';
const label = (user) => `${user?.nickname || '?'} (@${user?.uniqueId || '?'})`;

const gifters = new Set();
// Sempre há poucas missões na tela (config.missions.slots). Ao completar, a missão sobe de nível:
// ou evolui (mesma missão, meta maior) ou troca por outra do sorteio, também com meta maior.
const missionPool = config.missions.pool;
const missionSlots = [];
function pickMission(exclude) {
    const busyKinds = missionSlots.filter((s) => s && s.index !== exclude).map((s) => missionPool[s.index].kind);
    const taken = missionSlots.filter(Boolean).map((s) => s.index);
    // Prefere um tipo diferente das outras na tela (uma de curtidas, outra de presentes...)
    let options = missionPool.map((_, i) => i).filter((i) => !taken.includes(i) && !busyKinds.includes(missionPool[i].kind));
    if (!options.length) options = missionPool.map((_, i) => i).filter((i) => !taken.includes(i));
    return options[Math.floor(Math.random() * options.length)];
}
const MISSIONS_FILE = path.join(DATA_DIR, 'missoes.json');
function resetMissions() {
    missionSlots.length = 0;
    for (let slot = 0; slot < (config.missions.slots || 2); slot++) {
        missionSlots[slot] = { index: pickMission(-1), progress: 0, level: 1, scale: 1 };
    }
}
try {
    const saved = JSON.parse(fs.readFileSync(MISSIONS_FILE, 'utf8'));
    if (saved.length !== (config.missions.slots || 2) || saved.some((m) => !missionPool[m.index])) throw new Error('mudou');
    missionSlots.push(...saved);
} catch {
    resetMissions();
}
// Salva o progresso das missões (o index.js reinicia sozinho na live e não perde nada)
let saveTimer = null;
function saveLater() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFile(MISSIONS_FILE, JSON.stringify(missionSlots), () => {});
        fs.writeFile(DONORS_FILE, JSON.stringify(donors, null, 1), () => {});
    }, 3000);
}

// Top doadores de todas as lives (o ranking do overlay é só da live atual)
const DONORS_FILE = path.join(DATA_DIR, 'doadores.json');
let donors = {};
try { donors = JSON.parse(fs.readFileSync(DONORS_FILE, 'utf8')); } catch { /* ainda não existe */ }
const mvp = new Map(); // uniqueId -> { name, avatar, diamonds }
const fans = new Map(); // uniqueId -> { name, avatar, likes }

// Imagens dos presentes: guardadas quando o presente aparece na live, para os cards do overlay
const GIFT_IMAGES_FILE = path.join(__dirname, 'data', 'gift-images.json');
let giftImages = {};
try { giftImages = JSON.parse(fs.readFileSync(GIFT_IMAGES_FILE, 'utf8')); } catch { /* ainda não existe */ }

function rememberGiftImage(giftName, url) {
    if (!url || giftImages[giftName] === url) return;
    giftImages[giftName] = url;
    fs.mkdirSync(path.dirname(GIFT_IMAGES_FILE), { recursive: true });
    fs.writeFile(GIFT_IMAGES_FILE, JSON.stringify(giftImages, null, 2), () => {});
    broadcast('cards', giftCards());
}

function giftCards() {
    return Object.entries(config.gifts.actions).map(([gift, { label }]) => ({ gift, label, image: giftImages[gift] || null }));
}

function mvpTop() {
    return [...mvp.values()].sort((a, b) => b.diamonds - a.diamonds).slice(0, 3);
}

function fansTop() {
    return [...fans.values()].sort((a, b) => b.likes - a.likes).slice(0, 3);
}

// Curtidas chegam aos montes: manda o ranking no máximo a cada 2 s
let fansTimer = null;
function broadcastFans() {
    if (fansTimer) return;
    fansTimer = setTimeout(() => { fansTimer = null; broadcast('fans', fansTop()); }, 2000);
}

function currentMission(slot) {
    const state = missionSlots[slot];
    const mission = missionPool[state.index];
    return { ...mission, goal: Math.round(mission.goal * state.scale) };
}

function missionInfo(slot) {
    const mission = currentMission(slot);
    const state = missionSlots[slot];
    return {
        slot, kind: mission.kind, name: mission.name, reward: actionLabel(mission.action),
        level: state.level, progress: Math.min(state.progress, mission.goal), goal: mission.goal,
    };
}

function overlayState() {
    return {
        settings: config.overlay || {}, cards: giftCards(), missions: missionSlots.map((_, slot) => missionInfo(slot)),
        mvp: mvpTop(), fans: fansTop(),
    };
}

function progressMission(kind, amount) {
    missionSlots.forEach((state, slot) => {
        const mission = currentMission(slot);
        if (mission.kind !== kind) return;
        state.progress += amount;
        if (state.progress >= mission.goal) completeMission(slot, mission);
        broadcast('mission', missionInfo(slot));
        saveLater();
    });
}

function completeMission(slot, mission) {
    const state = missionSlots[slot];
    state.progress = 0;
    state.level += 1;
    state.scale *= config.missions.growth || 1.5;
    const evolves = Math.random() < (config.missions.evolveChance ?? 0.4);
    if (!evolves) state.index = pickMission(state.index);
    const next = currentMission(slot);
    console.log(`[${time()}] 🏁 Missão concluída: ${mission.name} → próxima: ${next.name} (${next.goal})`);
    runAction(mission.action, 'galera', 'missao');
    if (mission.action === 'policia') sayIconic('policia', 1);
    else sayIconic('missao', 1);
    brain.announce(`A galera completou a missão "${mission.name}" e liberou: ${actionLabel(mission.action)}. ` +
        `Próxima missão: "${next.name}"${evolves ? ' (a mesma, agora mais difícil)' : ''}`).then((t) => voice.say(t, 1));
}

function runAction(action, user, reason, count) {
    broadcast('action', { action, user, count, reason, label: actionLabel(action) });
    screenshots.snap(action);
}

const actionLabel = (action) => config.gifts.actionLabels?.[action] || action;

// Presente com ação fixa (os cards) ou, se não tiver, uma ação sorteada da faixa de valor
function pickGiftAction(giftName, diamonds) {
    const mapped = config.gifts.actions[giftName];
    if (mapped) return mapped;
    const tier = [...(config.gifts.tiers || [])].reverse().find((t) => diamonds >= t.minDiamonds);
    if (!tier) return null;
    const action = tier.actions[Math.floor(Math.random() * tier.actions.length)];
    return { action, label: actionLabel(action) };
}

// ---------- Eventos ----------
// Toques do CJ para quem fala besteira (2ª falta) e quando a pessoa vai pro castigo (3ª)
const WARN_LINES = [
    (n) => `${n}, aqui é família, parceiro. Maneira no linguajar senão vai pro castigo.`,
    (n) => `Ô ${n}, segura a onda aí, mano. Na Grove a gente respeita a gangue.`,
    (n) => `${n}, mais uma dessas e você fica no vácuo, tá ligado?`,
];
const MUTE_LINES = [
    (n) => `${n} tá de castigo, parceiro. A Grove não responde mais você.`,
    (n) => `Pronto, ${n} falou demais. Agora fica no vácuo, mano.`,
];
const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

async function handleChat(user, comment) {
    const verdict = moderation.check(user, comment);
    if (verdict !== 'ok') {
        console.log(`[${time()}] 🛡️  ${label(user)}: ${comment}  → ${{ ignore: 'ignorado', warn: 'advertido', mute: 'CASTIGO (banir no app)' }[verdict]}`);
        if (verdict === 'warn') voice.say(pick(WARN_LINES)(speakName(user)), 1, { meta: { kind: 'moderacao', user: '🛡️ Moderação' } });
        if (verdict === 'mute') voice.say(pick(MUTE_LINES)(speakName(user)), 1, { meta: { kind: 'moderacao', user: '🛡️ Moderação' } });
        return;
    }
    console.log(`[${time()}] 💬 ${label(user)}: ${comment}`);
    broadcast('chat', { user: user?.nickname || 'Anônimo', comment });
    progressMission('chats', 1);
    if (checkPlaceRequest(user, comment)) return;

    const decision = checkChat({ uniqueId: user?.uniqueId, comment, isGifter: gifters.has(user?.uniqueId) });
    if (!decision.reply) return;
    // Não gasta IA se a fila de voz já está cheia
    if (voice.pending >= config.voice.maxQueue) return;
    const reply = await brain.replyToChat(speakName(user), comment);
    voice.say(reply, 0, { meta: { kind: 'chat', user: user?.nickname || 'Anônimo', avatar: user?.avatar, question: comment } });
}

// A galera pede para o CJ ir a algum lugar ("vai na praia", "vai pra sua casa"...).
// Só lugares da lista de config.places (todos seguros, em terra firme): pedidos como "entra no mar",
// "voa pro infinito" ou "pula do prédio" não batem com nenhum lugar e são ignorados.
// Precisa de várias pessoas diferentes pedindo o mesmo lugar em pouco tempo.
const placeVotes = new Map(); // id do lugar -> Map(usuário -> hora)
const placeCooldown = new Map();
let lastPlaceAt = 0;
const plain = (text) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function checkPlaceRequest(user, comment) {
    const cfg = config.places;
    if (!cfg?.list?.length) return false;
    const text = plain(comment);
    if (!new RegExp(cfg.askPattern, 'i').test(text)) return false;
    const place = cfg.list.find((p) => p.words.some((w) => text.includes(plain(w))));
    if (!place) return false;

    const now = Date.now();
    const votes = placeVotes.get(place.id) || new Map();
    votes.set(user?.uniqueId || '?', now);
    for (const [id, at] of votes) if (now - at > cfg.windowSec * 1000) votes.delete(id);
    placeVotes.set(place.id, votes);
    console.log(`[${time()}] 📍 Pedido de lugar: ${place.name} (${votes.size}/${cfg.votesNeeded})`);

    const ready = votes.size >= cfg.votesNeeded
        && now - lastPlaceAt > cfg.cooldownSec * 1000
        && now > (placeCooldown.get(place.id) || 0);
    if (!ready) return false;
    votes.clear();
    lastPlaceAt = now;
    placeCooldown.set(place.id, now + cfg.samePlaceCooldownSec * 1000);
    console.log(`[${time()}] 🚶 A galera pediu e o CJ vai: ${place.name}`);
    runAction(place.action, 'galera', 'pedido');
    brain.announce(`Várias pessoas do chat pediram para você ir ${place.name}. Avise animado que está indo agora.`)
        .then((t) => voice.say(t, 1, { meta: { kind: 'pedido', user: 'A galera pediu', question: `bora ${place.name} 📍` } }));
    return true;
}

async function handleGift(user, giftName, count, diamondsEach, giftImage) {
    const diamonds = diamondsEach * count;
    const isBig = diamonds >= config.gifts.bigGiftDiamonds;
    const name = user.nickname;
    const avatar = user.avatar;
    const mapped = pickGiftAction(giftName, Math.max(diamonds, 1));
    console.log(`[${time()}] 🎁 ${label(user)} enviou ${count}x ${giftName}${diamonds ? ` = ${diamonds} 💎` : ''}`);
    gifters.add(user?.uniqueId);
    rememberGiftImage(giftName, giftImage);
    broadcast('gift', { user: name, avatar, giftName, giftImage: giftImage || giftImages[giftName] || null, count, diamonds, label: mapped?.label || null, isBig });

    if (mapped) {
        console.log(`[${time()}] 🎬 Ação: ${mapped.action}`);
        runAction(mapped.action, name, 'presente', count);
        if (mapped.action === 'policia') sayIconic('policia', 2); // o mod não avisa a polícia logo após uma ação
    }
    if (diamonds) {
        const entry = mvp.get(user?.uniqueId) || { name, avatar, diamonds: 0 };
        entry.diamonds += diamonds;
        mvp.set(user?.uniqueId, entry);
        broadcast('mvp', mvpTop());
        const donor = donors[user?.uniqueId] || { name, diamonds: 0 };
        donor.name = name;
        donor.diamonds += diamonds;
        donors[user?.uniqueId] = donor;
        saveLater();
        progressMission('diamonds', diamonds);
    }

    if (isBig) sayIconic('presente-grande', 2);
    const reply = await brain.reactToGift(speakName(user), giftName, count, diamonds, isBig, mapped?.label);
    voice.say(reply, isBig ? 2 : 1, { meta: { kind: 'gift', user: name, avatar, question: `enviou ${count}x ${giftName} 🎁` } });
}

// Meta de curtidas: fica escondida no overlay e aparece quando chegam curtidas (e de tempos em tempos,
// pedindo like). Cada vez que bate, solta uma surpresa sorteada e a próxima meta fica um pouco maior.
const likeCfg = config.likeGoal;
const likeGoal = { progress: 0, goal: likeCfg?.every || 300, level: 1 };
let likeTimer = null;
const likeInfo = (extra) => ({ ...likeGoal, ...extra });

function progressLikeGoal(amount) {
    if (!likeCfg) return;
    likeGoal.progress += amount;
    if (likeGoal.progress >= likeGoal.goal) {
        const action = likeCfg.actions[Math.floor(Math.random() * likeCfg.actions.length)];
        const done = likeGoal.goal;
        likeGoal.progress = 0;
        likeGoal.level += 1;
        likeGoal.goal = Math.round(likeGoal.goal * (likeCfg.growth || 1.2));
        console.log(`[${time()}] ❤️  Meta de curtidas batida (${done}) → ${actionLabel(action)}`);
        broadcast('like_goal', likeInfo({ hit: true, label: actionLabel(action) }));
        runAction(action, 'galera', 'curtidas');
        brain.announce(`A galera bateu a meta de ${done} curtidas e liberou uma surpresa: ${actionLabel(action)}. ` +
            'Agradeça e peça pra continuarem curtindo a tela para a próxima surpresa.').then((t) => voice.say(t, 1));
        return;
    }
    // Curtidas chegam aos montes: atualiza o overlay no máximo 1 vez por segundo
    if (likeTimer) return;
    likeTimer = setTimeout(() => { likeTimer = null; broadcast('like_goal', likeInfo()); }, 1000);
}
// Lembrete: de vez em quando a meta aparece sozinha pedindo like
if (likeCfg?.reminderEverySec) setInterval(() => broadcast('like_goal', likeInfo({ remind: true })), likeCfg.reminderEverySec * 1000).unref();

function handleLike(user, likeCount) {
    progressMission('likes', likeCount);
    progressLikeGoal(likeCount);
    const entry = fans.get(user?.uniqueId) || { name: user?.nickname || 'Anônimo', avatar: user?.avatar, likes: 0 };
    entry.likes += likeCount;
    fans.set(user?.uniqueId, entry);
    broadcastFans();
}

// Às vezes o CJ solta uma fala icônica com o áudio ORIGINAL do jogo: os arquivos .mp3/.wav ficam em
// falas-originais/<evento>/ (o nome do arquivo vira a legenda). Pasta vazia = não fala nada.
// Retorna true se falou, para quem chamou decidir se ainda fala em português.
const ICONIC_DIR = path.join(__dirname, 'falas-originais');
const iconicDecks = {};
function sayIconic(kind, priority) {
    const cfg = config.voice.iconic;
    const dir = path.join(ICONIC_DIR, kind);
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => /\.(mp3|wav)$/i.test(f)); } catch { /* sem pasta */ }
    if (!files.length || Math.random() >= (cfg?.chance?.[kind] ?? cfg?.chance?.default ?? 0)) return false;
    // Baralho embaralhado: só repete uma fala depois de tocar todas da pasta
    let deck = (iconicDecks[kind] || []).filter((f) => files.includes(f));
    if (!deck.length) deck = files.slice().sort(() => Math.random() - 0.5);
    const file = deck.pop();
    iconicDecks[kind] = deck;
    const text = file.replace(/\.\w+$/, '').replace(/\s*\(\d+\)$/, '');
    console.log(`[${time()}] 🎙️  Fala original: ${text}`);
    voice.say(text, priority, { file: path.join(dir, file), meta: { kind: 'original' } });
    return true;
}

// De vez em quando, com a live quieta, o CJ solta uma fala original solta (pasta falas-originais/aleatorio)
const idleRange = config.voice.iconic?.idleEverySec;
function scheduleIdleLine() {
    if (!idleRange) return;
    const [min, max] = idleRange;
    setTimeout(() => {
        if (voice.pending === 0) sayIconic('aleatorio', 0);
        scheduleIdleLine();
    }, (min + Math.random() * (max - min)) * 1000).unref();
}
scheduleIdleLine();

// O CJ comenta o que aconteceu no jogo; não fura a fila de presentes
async function handleGameEvent({ kind, text }) {
    console.log(`[${time()}] 🎮 Jogo: ${text}`);
    if (voice.pending > 1) return;
    if (sayIconic(kind, 1)) return;
    const reply = await brain.reactToGame(kind, text);
    voice.say(reply, 1);
}

async function handleFollow(user) {
    console.log(`[${time()}] ➕ ${label(user)} começou a seguir`);
    progressMission('follows', 1);
    // Agradece alguns seguidores, sem atropelar falas mais importantes
    if (voice.pending === 0 && Math.random() < 0.5) {
        if (sayIconic('seguidor', 0)) return;
        const reply = await brain.welcomeFollower(speakName(user));
        voice.say(reply, 0, { meta: { kind: 'follow', user: user?.nickname, avatar: user?.avatar, question: 'começou a seguir ➕' } });
    }
}

// ---------- Comandos do menu (tools/testar.js, tools/resetar.js) ----------
function handleAdmin({ cmd, action }) {
    if (cmd === 'action' && action) {
        const label = actionLabel(action);
        console.log(`[${time()}] 🧪 Teste de ação: ${label}`);
        broadcast('gift', { user: 'TESTE', avatar: null, giftName: 'teste', giftImage: null, count: 1, diamonds: 0, label, isBig: false });
        runAction(action, 'TESTE', 'teste');
        if (action === 'policia') sayIconic('policia', 2);
    } else if (cmd === 'reset') {
        resetMissions();
        saveLater();
        console.log(`[${time()}] 🔄 Missões resetadas`);
        missionSlots.forEach((_, slot) => broadcast('mission', missionInfo(slot)));
    }
}

// ---------- Fonte: TikTok LIVE ----------
function startTikTok() {
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
    const connection = new TikTokLiveConnection(username, {
        signApiKey: process.env.EULER_API_KEY || undefined,
    });

    connection.on(WebcastEvent.CHAT, (data) => handleChat(normUser(data.user), data.content || data.comment || ''));

    connection.on(WebcastEvent.GIFT, (data) => {
        const gift = data.gift || {};
        const old = data.giftDetails || {};
        // Presentes do tipo 1 chegam em sequência (streak); só processa quando a sequência termina
        if ((gift.type ?? old.giftType) === 1 && !data.repeatEnd) return;
        handleGift(
            normUser(data.user),
            gift.name || old.giftName || `id ${data.giftId}`,
            data.repeatCount || 1,
            gift.diamondCount || old.diamondCount || 0,
            gift.image?.urlList?.[0] || gift.icon?.urlList?.[0] || old.giftImage?.giftPictureUrl,
        );
    });

    connection.on(WebcastEvent.LIKE, (data) => handleLike(normUser(data.user), data.count || data.likeCount || 1));

    if (WebcastEvent.FOLLOW) connection.on(WebcastEvent.FOLLOW, (data) => handleFollow(normUser(data.user)));

    connection.on(WebcastEvent.STREAM_END, () => {
        console.log(`[${time()}] 📴 A live terminou.`);
        process.exit(0);
    });

    connection.on(ControlEvent.DISCONNECTED, ({ reason } = {}) => {
        console.warn(`[${time()}] ⚠️  Desconectado${reason ? `: ${reason}` : ''}. Reconectando em ${RECONNECT_DELAY_MS / 1000}s...`);
        setTimeout(connect, RECONNECT_DELAY_MS);
    });

    connection.on(ControlEvent.ERROR, ({ info, exception } = {}) => {
        console.error(`[${time()}] ❌ Erro: ${info || ''} ${exception?.message || ''}`);
    });

    async function connect() {
        try {
            const state = await connection.connect();
            console.log(`[${time()}] ✅ Conectado à live de @${username} (roomId ${state.roomId})`);
        } catch (err) {
            console.error(`[${time()}] Falha ao conectar: ${err.message}`);
            if (err.constructor?.name === 'UserOfflineError') {
                console.error('O usuário não está ao vivo agora.');
                process.exit(1);
            }
            setTimeout(connect, RECONNECT_DELAY_MS);
        }
    }

    process.on('SIGINT', async () => {
        console.log('\nEncerrando...');
        await connection.disconnect();
        process.exit(0);
    });

    connect();
}

// ---------- Fonte: simulador ----------
function startSimulator() {
    console.log(`🧪 Modo simulador. Comandos:
   chat <usuario> <mensagem>
   gift <usuario> <presente> [quantidade] [diamantes_cada]
   like <usuario> [quantidade]
   follow <usuario>
   sair`);
    console.log('⚠️  Deixe esta janela aberta: se fechar, o overlay mostra "desconectado".');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
    rl.prompt();
    rl.on('line', (line) => {
        setTimeout(() => rl.prompt(), 50);
        const [cmd, user, ...rest] = line.trim().split(/\s+/);
        const u = cleanUser({ uniqueId: user, nickname: user, avatar: null });
        if (cmd === 'chat' && user) handleChat(u, rest.join(' '));
        else if (cmd === 'gift' && user && rest[0]) {
            // O nome do presente pode ter espaço ("Hand Hearts"): os números no fim são quantidade e diamantes
            const nums = [];
            while (rest.length > 1 && /^\d+$/.test(rest[rest.length - 1])) nums.unshift(Number(rest.pop()));
            handleGift(u, rest.join(' '), nums[0] || 1, nums[1] || 1);
        }
        else if (cmd === 'like' && user) handleLike(u, Number(rest[0]) || 1);
        else if (cmd === 'follow' && user) handleFollow(u);
        else if (cmd === 'sair') process.exit(0);
        else if (cmd) console.log('Comando inválido.');
    });
}

console.log('\n   ===  CJ LIVE  ·  por AjKaBaL  ===\n');
console.log(`[${time()}] 🚀 Overlay em http://localhost:${WS_PORT}  (WebSocket ws://localhost:${WS_PORT})`);
if (!process.env.GEMINI_API_KEY) console.warn('⚠️  GEMINI_API_KEY vazia no .env — o CJ vai usar falas prontas.');
simMode ? startSimulator() : startTikTok();
