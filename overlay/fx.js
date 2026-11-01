// CJ LIVE — por AjKaBaL
// Animações do overlay: o presente recebido aparecendo grande na tela e um efeito para cada ação
// (chuva de dinheiro, neve, sirene da polícia...). Tudo em #fx, por cima do resto e sem bloquear nada.

const FX = (() => {
    const layer = () => document.getElementById('fx');
    const rand = (min, max) => min + Math.random() * (max - min);

    function spawn(className, html, ms) {
        const node = document.createElement('div');
        node.className = className;
        if (html != null) node.innerHTML = html;
        layer().append(node);
        setTimeout(() => node.remove(), ms);
        return node;
    }

    // Chuva de emojis caindo do topo
    function rain(emojis, count, { size = 70, duration = [2.5, 4.5], spread = 2500 } = {}) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const d = rand(...duration);
                const drop = spawn('fx-drop', emojis[Math.floor(Math.random() * emojis.length)], d * 1000 + 100);
                drop.style.left = `${rand(0, 1040)}px`;
                drop.style.fontSize = `${size * rand(0.7, 1.3)}px`;
                drop.style.animationDuration = `${d}s`;
                drop.style.setProperty('--spin', `${rand(-360, 360)}deg`);
                drop.style.setProperty('--drift', `${rand(-120, 120)}px`);
            }, rand(0, spread));
        }
    }

    // Explosão de emojis saindo de um ponto
    function burst(emojis, count, x = 540, y = 760, distance = 420) {
        for (let i = 0; i < count; i++) {
            const angle = rand(0, Math.PI * 2);
            const dist = rand(distance * 0.4, distance);
            const node = spawn('fx-burst', emojis[i % emojis.length], 1400);
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
            node.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
            node.style.fontSize = `${rand(40, 80)}px`;
        }
    }

    function banner(text, color = '#2ecc40', ms = 2600) {
        const node = spawn('fx-banner', null, ms);
        node.textContent = text;
        node.style.setProperty('--c', color);
        node.style.animationDuration = `${ms}ms`;
    }

    // Bordas da tela piscando (sirene, raio...)
    function flash(className, ms) {
        spawn(`fx-flash ${className}`, null, ms);
    }

    // Presente recebido: imagem grande no meio, girando com raios de luz e confete
    function gift(g) {
        const pic = g.giftImage ? `<img src="${g.giftImage}" alt="">` : '<span class="fx-gift-emoji">🎁</span>';
        const node = spawn(`fx-gift${g.isBig ? ' big' : ''}`, `<div class="fx-rays"></div>${pic}<div class="fx-gift-count">x${g.count || 1}</div>`, 2600);
        node.style.setProperty('--c', g.isBig ? '#ffd23f' : '#fe2c55');
        burst(g.isBig ? ['🎉', '✨', '💎', '⭐'] : ['✨', '💖', '⭐'], g.isBig ? 36 : 16);
    }

    const ACTIONS = {
        chuva_dinheiro: () => rain(['💵', '💸', '💰'], 45),
        neve: () => rain(['❄️', '❅', '❆'], 70, { size: 50, duration: [5, 8], spread: 6000 }),
        chuva_vacas: () => rain(['🐄'], 18, { size: 110 }),
        chuva_carros: () => rain(['🚗', '🚕', '🚙', '🛵'], 22, { size: 100 }),
        palhacos: () => { rain(['🤡'], 20, { size: 100 }); banner('INVASÃO DE PALHAÇOS!', '#ff2d95'); },
        pumas: () => { burst(['🐆'], 10); banner('CUIDADO, PUMAS!', '#ff7a00'); },
        fogos: () => { for (let i = 0; i < 6; i++) setTimeout(() => burst(['🎆', '✨', '🎇'], 14, rand(150, 930), rand(250, 900), 250), i * 350); },
        explodir_tudo: () => { flash('boom', 900); burst(['💥', '🔥'], 30); },
        tornado: () => { spawn('fx-tornado', '🌪️', 3500); rain(['🚗', '🧍', '🗑️'], 12, { size: 70, duration: [2, 3] }); },
        queda_aviao: () => { spawn('fx-plane', '✈️', 2200); setTimeout(() => { flash('boom', 900); burst(['💥', '🔥', '💨'], 26); }, 1900); },
        policia: () => { flash('siren', 6000); banner('★★★★★  PROCURADO!', '#1e90ff', 3500); },
        ballas: () => { flash('purple', 2500); banner('OS BALLAS CHEGARAM!', '#a640ff'); },
        grove_aliados: () => { flash('green', 2500); banner('GROVE STREET 4 LIFE!', '#2ecc40'); },
        tempestade: () => { for (let i = 0; i < 4; i++) setTimeout(() => flash('lightning', 400), i * 700); rain(['💧'], 40, { size: 40, duration: [1, 2] }); },
        camera_lenta: () => { spawn('fx-letterbox', '<i></i><i></i>', 12000); banner('SLOW MOTION', '#25f4ee', 3000); },
        lua: () => { rain(['🌙', '⭐', '🪐'], 14, { size: 70, duration: [6, 9] }); banner('GRAVIDADE DA LUA!', '#c9b8ff'); },
        zerinho: () => burst(['🌀', '💨', '🛞'], 14),
        rampa: () => banner('🚀 VOOU NA RAMPA!', '#ff7a00'),
        vandalismo: () => { burst(['💥', '🔥'], 16); banner('DESTRUIU O CARRO!', '#ff2020'); },
        briga: () => { burst(['👊', '💢', '💥'], 14); banner('BRIGA DE RUA!', '#ff7a00'); },
        tiro_pro_alto: () => burst(['💥', '✨'], 10),
        corrida: () => burst(['🏃', '💨'], 10),
        maluquice: () => burst(['🤪', '🐔', '🎸', '😂'], 14),
        andar_trevor: () => banner('ANDANDO IGUAL O TREVOR', '#ff7a00'),
        furia_trevor: () => { flash('rage', 8000); banner('FÚRIA DO TREVOR!', '#ff2020', 3000); },
        bebado: () => { spawn('fx-dizzy', '😵‍💫', 5000); banner('CJ TÁ TONTO...', '#ffd23f'); },
        empinar: () => banner('🏍️ EMPINANDO!', '#ff7a00'),
        tanque: () => banner('🪖 CJ PEGOU UM TANQUE!', '#2ecc40'),
        carro_tunado: () => { burst(['✨', '🔧', '🚗'], 18); banner('CARRO TUNADO!', '#25f4ee'); },
        voar: () => burst(['🦸', '💨', '☁️'], 14),
        queda_livre: () => rain(['🪂', '☁️'], 10, { size: 90 }),
        noite: () => burst(['🌙', '☀️'], 8),
        dancar: () => burst(['💃', '🎵', '🎶'], 14),
        aplaudir: () => burst(['👏'], 12),
        acenar: () => burst(['👋'], 8),
        flexionar: () => burst(['💪'], 10),
        academia: () => burst(['💪', '🏋️'], 10),
        pier: () => burst(['🎣', '🐟'], 10),
        moto: () => burst(['🏍️', '💨'], 10),
        bmx: () => burst(['🚲', '💨'], 10),
    };

    function action(a) {
        const run = ACTIONS[a.action];
        if (run) run();
        // Ações que não vieram de presente (missão, pedido do chat) ganham uma faixa com o nome
        if (a.reason === 'missao') banner(`🏁 MISSÃO: ${a.label}`, '#ffd23f', 3200);
        else if (a.reason === 'pedido') banner(`📍 ${a.label}`, '#25f4ee', 3000);
        else if (a.reason === 'curtidas') banner(`❤️ ${a.label}`, '#fe2c55', 3200);
    }

    // Meta de curtidas batida: chuva de corações
    function likeGoal() {
        rain(['❤️', '💖', '💗', '💕'], 50, { size: 60 });
        burst(['❤️', '💖'], 24, 540, 1530, 380);
    }

    return { gift, action, likeGoal };
})();
