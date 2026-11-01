// CJ LIVE — por AjKaBaL
// Overlay do OBS: recebe os eventos do index.js via WebSocket e desenha metas, rankings, cards,
// alertas e o card da fala do CJ.

const $ = (id) => document.getElementById(id);
const ALERT_MS = 4500;
let settings = {};

// Escala o palco 1080x1920 para caber na janela (no OBS em 1080x1920 fica 1:1)
function fitStage() {
    const scale = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
    $('stage').style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitStage);
fitStage();

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');

// Sem foto (simulador ou perfil sem avatar): bolinha com a inicial do nome
function avatarSrc(url, name) {
    if (url) return url;
    const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#3a2a5a"/>` +
        `<text x="50" y="66" font-family="Arial" font-weight="bold" font-size="50" fill="#fff" text-anchor="middle">${letter.replace(/[<&>"]/g, '')}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ---------- Missões: cada uma sobe de nível quando completa (e pode trocar) ----------
const GOAL_ICONS = { likes: '❤️', diamonds: '💎', follows: '👥', chats: '💬' };

function renderGoal(m) {
    let node = document.querySelector(`.goal[data-slot="${m.slot}"]`);
    if (!node) {
        node = el('div', 'goal');
        node.dataset.slot = m.slot;
        const bar = el('div', 'goal-bar neon');
        const text = el('div', 'goal-text');
        text.append(el('span', 'goal-name outline'), el('span', 'goal-count outline'), el('span', 'goal-reward'));
        bar.append(el('div', 'goal-fill'), text);
        node.append(el('div', 'goal-level neon outline'), bar);
        $('goals').append(node);
    }
    const apply = (info) => {
        node.dataset.kind = info.kind; // a cor segue o tipo da missão
        node.querySelector('.goal-level').textContent = info.level;
        node.querySelector('.goal-name').textContent = `${GOAL_ICONS[info.kind] || '⭐'} ${info.name}:`;
        node.querySelector('.goal-count').textContent = `${fmt(info.progress)} / ${fmt(info.goal)}`;
        node.querySelector('.goal-reward').textContent = `🎁 ${info.reward}`;
        node.querySelector('.goal-fill').style.width = `${Math.min(100, (info.progress / info.goal) * 100)}%`;
    };

    // Completou: o servidor já mandou a próxima etapa. Mostra a barra cheia, comemora e só depois troca
    const prev = node.dataset.level ? Number(node.dataset.level) : m.level;
    node.dataset.level = m.level;
    if (m.level > prev && node.dataset.info) {
        const old = JSON.parse(node.dataset.info);
        apply({ ...old, progress: old.goal });
        node.classList.add('done');
        setTimeout(() => {
            node.classList.remove('done');
            apply(JSON.parse(node.dataset.info));
        }, 2800);
    } else if (!node.classList.contains('done')) {
        apply(m);
    }
    node.dataset.info = JSON.stringify(m);
}

// ---------- Rankings ----------
function renderRank(id, list, valueText) {
    const box = $(id);
    box.hidden = !list.length;
    const ol = box.querySelector('ol');
    const sameOrder = [...ol.children].map((li) => li.dataset.name).join('|') === list.map((u) => u.name).join('|');
    if (sameOrder) { // só atualiza os números, sem reanimar
        list.forEach((u, i) => { ol.children[i].querySelector('.rank-value').textContent = valueText(u); });
        return;
    }
    ol.replaceChildren(...list.map((u, i) => {
        const li = el('li', 'neon');
        li.dataset.name = u.name;
        const avatar = el('img', 'rank-avatar');
        avatar.src = avatarSrc(u.avatar, u.name);
        const info = el('div', 'rank-info');
        info.append(el('div', 'rank-name outline', u.name), el('div', 'rank-value', valueText(u)));
        li.append(avatar, info, el('span', 'rank-pos outline', `${i + 1}º`));
        return li;
    }));
}
const renderGifters = (list) => renderRank('gifters', list, (u) => `💎 ${fmt(u.diamonds)}`);
const renderFans = (list) => renderRank('fans', list, (u) => `❤️ ${fmt(u.likes)}`);

// ---------- Cards: aparecem de tempos em tempos e quando chega presente ----------
let cardsHideTimer = null;

function renderCards(cards) {
    const box = $('cards');
    box.replaceChildren(...cards.map((c) => {
        const card = el('div', 'card');
        card.dataset.gift = c.gift;
        const inner = el('div', 'card-inner');
        inner.append(el('div', 'card-gift outline', c.gift));
        if (c.image) {
            const img = el('img', 'card-img');
            img.src = c.image;
            inner.append(img);
        } else {
            inner.append(el('div', 'card-img placeholder', '🎁'));
        }
        inner.append(el('div', 'card-label outline', c.label));
        card.append(inner);
        return card;
    }));
}

function showCards(seconds = settings.cardsShowSec ?? 15) {
    $('cards').classList.remove('away');
    clearTimeout(cardsHideTimer);
    cardsHideTimer = setTimeout(() => $('cards').classList.add('away'), seconds * 1000);
}

function startCardsCycle() {
    $('cards').classList.add('away');
    const every = (settings.cardsEverySec ?? 60) * 1000;
    if (every <= 0) return showCards(1e9); // 0 = sempre na tela
    setTimeout(showCards, 3000);
    setInterval(showCards, every);
}

function fireCard(giftName) {
    const card = [...$('cards').children].find((c) => c.dataset.gift === giftName);
    if (!card) return;
    showCards(6);
    card.classList.remove('fired');
    void card.offsetWidth; // reinicia a animação
    card.classList.add('fired');
}

// ---------- Alertas (um de cada vez) ----------
const alertQueue = [];
let alertBusy = false;

function showNextAlert() {
    if (alertBusy || !alertQueue.length) return;
    alertBusy = true;
    const g = alertQueue.shift();
    const box = $('alert');

    $('alert-avatar').src = avatarSrc(g.avatar, g.user);
    $('alert-user').textContent = g.user;
    $('alert-gift-img').src = g.giftImage || '';
    $('alert-gift-img').hidden = !g.giftImage;
    $('alert-gift-text').textContent = `enviou ${g.count}x ${g.giftName}${g.diamonds ? ` · ${fmt(g.diamonds)} 💎` : ''}`;
    $('alert-label').textContent = g.label ? `→ ${g.label}` : '';
    for (const node of [$('alert-user'), $('alert-gift-text'), $('alert-label')]) node.classList.add('outline');

    box.classList.toggle('big', !!g.isBig);
    box.classList.remove('leaving');
    box.hidden = false;

    setTimeout(() => {
        box.classList.add('leaving');
        setTimeout(() => {
            box.hidden = true;
            alertBusy = false;
            showNextAlert();
        }, 400);
    }, ALERT_MS);
}

// ---------- Card da fala: revela as palavras no ritmo da voz ----------
let replyTimer = null;
let replyHideTimer = null;

function startReply(s) {
    clearInterval(replyTimer);
    clearTimeout(replyHideTimer);
    const box = $('reply');
    const isOriginal = s.kind === 'original';
    const name = s.user || 'CJ';
    box.classList.toggle('no-avatar', !s.user);
    $('reply-avatar').src = avatarSrc(s.avatar, name);
    $('reply-user').textContent = isOriginal ? 'CJ 🎙️' : name;
    $('reply-question').textContent = isOriginal ? 'fala original' : (s.question ? `"${s.question}"` : '');

    const words = s.text.split(' ');
    const step = Math.max(80, (s.durationMs || 3000) / words.length);
    let shown = 0;
    $('reply-text').textContent = '';
    box.classList.remove('leaving');
    box.hidden = false;
    replyTimer = setInterval(() => {
        shown++;
        $('reply-text').textContent = words.slice(0, shown).join(' ');
        if (shown >= words.length) clearInterval(replyTimer);
    }, step);
}

function endReply() {
    clearInterval(replyTimer);
    replyHideTimer = setTimeout(() => {
        $('reply').classList.add('leaving');
        replyHideTimer = setTimeout(() => { $('reply').hidden = true; }, 350);
    }, 1200);
}

// ---------- Meta de curtidas (aparece e some) ----------
let likeHideTimer = null;

function renderLikeGoal(g) {
    const box = $('likegoal');
    const remaining = Math.max(0, g.goal - g.progress);
    $('like-fill').style.width = `${g.hit ? 100 : Math.min(100, (g.progress / g.goal) * 100)}%`;
    $('like-count').textContent = g.hit ? 'META BATIDA!' : `${fmt(g.progress)} / ${fmt(g.goal)}`;
    $('like-title').textContent = g.hit ? `🎉 LIBEROU: ${g.label}`
        : g.remind ? `CURTE A TELA! Faltam ${fmt(remaining)} pra surpresa`
        : `META DE CURTIDAS · faltam ${fmt(remaining)}`;
    box.classList.toggle('hit', !!g.hit);
    if (box.hidden) { box.hidden = false; box.classList.remove('leaving'); }
    clearTimeout(likeHideTimer);
    likeHideTimer = setTimeout(() => {
        box.classList.add('leaving');
        likeHideTimer = setTimeout(() => { box.hidden = true; box.classList.remove('leaving'); }, 400);
    }, g.hit ? 7000 : g.remind ? 7000 : 5000);
    if (g.hit) FX.likeGoal();
}

// ---------- WebSocket ----------
let cycleStarted = false;
const handlers = {
    init: (s) => {
        settings = s.settings || {};
        $('gifters-title').textContent = settings.giftersTitle || 'TOP PRESENTES';
        $('fans-title').textContent = settings.fansTitle || 'TOP CURTIDAS';
        for (const node of [$('gifters-title'), $('fans-title')]) node.className = 'neon outline';
        renderCards(s.cards);
        $('goals').replaceChildren();
        s.missions.forEach(renderGoal);
        renderGifters(s.mvp);
        renderFans(s.fans || []);
        if (!cycleStarted) { cycleStarted = true; startCardsCycle(); }
    },
    cards: renderCards,
    mission: renderGoal,
    mvp: renderGifters,
    fans: renderFans,
    gift: (g) => {
        FX.gift(g);
        fireCard(g.giftName);
        alertQueue.push(g);
        showNextAlert();
    },
    action: FX.action,
    like_goal: renderLikeGoal,
    speak_start: startReply,
    speak_end: endReply,
};

function connect() {
    const ws = new WebSocket(`ws://${location.host || 'localhost:8080'}`);
    ws.onopen = () => { $('status').className = 'ok'; };
    ws.onmessage = (event) => {
        const { type, payload } = JSON.parse(event.data);
        handlers[type]?.(payload);
    };
    ws.onclose = () => {
        $('status').className = '';
        setTimeout(connect, 2000);
    };
}
connect();
