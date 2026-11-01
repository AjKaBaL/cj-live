// CJ LIVE — por AjKaBaL
// Assistente de configuração: acha o GTA, confere os mods, configura o OBS (cena vertical pronta),
// o GTA (janela sem bordas), o usuário do TikTok, a chave da IA e a voz, e cria o atalho na área de trabalho.
// Roda sozinho na primeira vez do "Ligar CJ LIVE" e pela opção [C] do menu.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline/promises');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG_FILE = path.join(ROOT, 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
config.pc = config.pc || {};
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ok = (t) => console.log(`   ✅ ${t}`);
const warn = (t) => console.log(`   ⚠️  ${t}`);
const step = (n, t) => console.log(`\n ── ${n}. ${t} ${'─'.repeat(Math.max(0, 50 - t.length))}`);
const ask = async (q) => (await rl.question(`   ${q} `)).trim();
const yes = async (q) => /^s/i.test(await ask(`${q} (S/N)`));
const openUrl = (url) => spawnSync('cmd.exe', ['/c', `start "" "${url}"`], { windowsVerbatimArguments: true });
const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };
const ps = (cmd) => execSync(`powershell -NoProfile -Command "${cmd}"`, { encoding: 'utf8' }).trim();

// ---------- 1. GTA ----------
// Procura o GTA V Legacy na Epic (manifests), na Steam (bibliotecas) e em pastas comuns
function findGta() {
    const found = [];
    const manifests = 'C:/ProgramData/Epic/EpicGamesLauncher/Data/Manifests';
    try {
        for (const f of fs.readdirSync(manifests).filter((n) => n.endsWith('.item'))) {
            const m = JSON.parse(fs.readFileSync(path.join(manifests, f), 'utf8'));
            if (/grand theft auto v/i.test(m.DisplayName || '') && exists(path.join(m.InstallLocation, 'GTA5.exe'))) {
                found.push({ dir: m.InstallLocation, store: 'Epic', launch: `com.epicgames.launcher://apps/${m.AppName}?action=launch&silent=true` });
            }
        }
    } catch { /* sem Epic */ }
    const steamRoots = ['C:/Program Files (x86)/Steam', 'C:/Program Files/Steam'];
    for (const root of steamRoots) {
        let libs = [root];
        try {
            const vdf = fs.readFileSync(path.join(root, 'steamapps/libraryfolders.vdf'), 'utf8');
            libs = [...libs, ...[...vdf.matchAll(/"path"\s+"([^"]+)"/g)].map((m) => m[1].replace(/\\\\/g, '/'))];
        } catch { /* sem Steam aqui */ }
        for (const lib of libs) {
            const dir = path.join(lib, 'steamapps/common/Grand Theft Auto V');
            if (exists(path.join(dir, 'GTA5.exe'))) found.push({ dir, store: 'Steam', launch: 'steam://rungameid/271590' });
        }
    }
    for (const dir of ['C:/GTAV', 'D:/GTAV', 'E:/GTAV', 'C:/Games/GTAV', 'D:/Games/GTAV']) {
        if (exists(path.join(dir, 'GTA5.exe')) && !found.some((f) => path.resolve(f.dir) === path.resolve(dir))) {
            found.push({ dir, store: 'pasta', launch: path.join(dir, 'PlayGTAV.exe') });
        }
    }
    return found;
}

async function setupGta() {
    step(1, 'GTA V Legacy');
    const found = findGta();
    let pick = found[0];
    if (found.length > 1) {
        found.forEach((f, i) => console.log(`   [${i + 1}] ${f.dir} (${f.store})`));
        pick = found[(Number(await ask('Qual é o GTA certo? Número:')) || 1) - 1] || found[0];
    }
    if (!pick) {
        warn('Não achei o GTA V Legacy sozinho (o Enhanced não serve: os mods são para o Legacy).');
        const dir = (await ask('Cole o caminho da pasta do GTA (onde fica o GTA5.exe):')).replace(/"/g, '');
        if (!exists(path.join(dir, 'GTA5.exe'))) { warn('Não tem GTA5.exe nessa pasta. Pulei; ajuste "pc.gtaDir" no config.json depois.'); return null; }
        pick = { dir, store: 'pasta', launch: path.join(dir, 'PlayGTAV.exe') };
    }
    ok(`GTA em ${pick.dir} (${pick.store})`);
    config.pc.gtaDir = pick.dir.replace(/\\/g, '/');
    config.pc.gtaLaunch = pick.launch.replace(/\\/g, '/');
    return pick.dir;
}

// ---------- 2. Mods (ScriptHookV, ScriptHookVDotNet, skin do CJ) ----------
async function setupMods(gta) {
    step(2, 'Mods do GTA');
    if (!gta) { warn('Sem a pasta do GTA, pulei esta parte.'); return; }
    const checks = [
        { name: 'ScriptHookV', files: ['ScriptHookV.dll', 'dinput8.dll'], url: 'http://www.dev-c.com/gtav/scripthookv/',
            how: 'Baixe, abra o .zip e copie ScriptHookV.dll e dinput8.dll (pasta "bin") para a pasta do GTA.' },
        { name: 'ScriptHookVDotNet 3', files: ['ScriptHookVDotNet.asi', 'ScriptHookVDotNet3.dll'],
            url: 'https://github.com/scripthookvdotnet/scripthookvdotnet-nightly/releases',
            how: 'Baixe o .zip mais novo e copie TODOS os arquivos para a pasta do GTA.' },
    ];
    for (const c of checks) {
        while (!c.files.every((f) => exists(path.join(gta, f)))) {
            warn(`${c.name} não está instalado. ${c.how}`);
            if (!(await yes('Abrir a página de download agora?'))) break;
            openUrl(c.url);
            await ask('Depois de copiar os arquivos, aperte Enter...');
        }
        if (c.files.every((f) => exists(path.join(gta, f)))) ok(`${c.name} instalado`);
    }
    if (exists(path.join(gta, 'mods/update/x64/dlcpacks/CJClassic'))) ok('Skin do CJ instalada');
    else {
        warn('Skin do CJ não encontrada. Sem ela o personagem fica o Franklin (a live funciona igual).');
        console.log('      Baixe o "CJ Full Replacement" no gta5-mods.com e instale com o OpenIV na pasta "mods".');
        if (await yes('Abrir a página do mod agora?')) openUrl('https://www.gta5-mods.com/search/CJ%20Full%20Replacement');
    }
    fs.mkdirSync(path.join(gta, 'scripts'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'gta-mod/CjLive.cs'), path.join(gta, 'scripts/CjLive.3.cs'));
    ok('Mod da CJ LIVE instalado na pasta scripts');
}

// ---------- 3. Gráficos do GTA: janela sem bordas e sem pausar ao perder o foco ----------
async function setupGtaGraphics() {
    step(3, 'Tela do GTA (para o OBS capturar)');
    let docs;
    try { docs = ps("[Environment]::GetFolderPath('MyDocuments')"); } catch { docs = path.join(os.homedir(), 'Documents'); }
    const file = path.join(docs, 'Rockstar Games/GTA V/settings.xml');
    if (!exists(file)) { warn('Abra o GTA uma vez e feche, depois rode o assistente de novo (opção C). No jogo: Gráficos → "Janela sem bordas".'); return; }
    let xml = fs.readFileSync(file, 'utf8');
    if (/<Windowed value="2"/.test(xml) && /<PauseOnFocusLoss value="0"/.test(xml)) { ok('Já está em janela sem bordas e sem pausar'); return; }
    if (!(await yes('Colocar o GTA em "janela sem bordas" e sem pausar quando sai da janela? (feche o GTA antes)'))) return;
    fs.copyFileSync(file, `${file}.antes-cj-live`);
    xml = xml.replace(/<Windowed value="\d+"/, '<Windowed value="2"').replace(/<PauseOnFocusLoss value="\d+"/, '<PauseOnFocusLoss value="0"');
    fs.writeFileSync(file, xml);
    ok('Feito (cópia do original: settings.xml.antes-cj-live)');
}

// ---------- 4. OBS: perfil 1080x1920 + cena com o jogo e o overlay ----------
function obsCollection() {
    const uuid = () => crypto.randomUUID();
    const game = { id: 'game_capture', versioned_id: 'game_capture', name: 'GTA V', uuid: uuid(),
        settings: { capture_mode: 'window', window: 'Grand Theft Auto V:grcWindow:GTA5.exe' } };
    const overlay = { id: 'browser_source', versioned_id: 'browser_source', name: 'Overlay CJ LIVE', uuid: uuid(),
        settings: { url: 'http://localhost:8080', width: 1080, height: 1920, reroute_audio: false } };
    const desktop = { id: 'wasapi_output_capture', versioned_id: 'wasapi_output_capture', name: 'Áudio da área de trabalho', uuid: uuid(),
        settings: { device_id: 'default' } };
    const item = (src, id, bounds) => ({
        name: src.name, source_uuid: src.uuid, visible: true, locked: false, rot: 0, id, align: 5,
        pos: { x: 0, y: 0 }, scale: { x: 1, y: 1 },
        bounds_type: bounds ? 3 : 0, bounds_align: 0, bounds: { x: 1080, y: 1920 }, // 3 = "dimensionar para os limites externos"
        crop_left: 0, crop_top: 0, crop_right: 0, crop_bottom: 0,
    });
    const scene = { id: 'scene', versioned_id: 'scene', name: 'CJ LIVE', uuid: uuid(),
        settings: { id_counter: 2, custom_size: false, items: [item(game, 1, true), item(overlay, 2, false)] } };
    return {
        name: 'CJ LIVE', current_scene: 'CJ LIVE', current_program_scene: 'CJ LIVE', scene_order: [{ name: 'CJ LIVE' }],
        sources: [scene, game, overlay, desktop], DesktopAudioDevice1: desktop,
        groups: [], transitions: [], current_transition: 'Fade', transition_duration: 300, quick_transitions: [], saved_projectors: [],
        preview_locked: false, scaling_enabled: false, modules: {},
    };
}

function obsProfile() {
    let nvidia = false;
    try { execSync('where nvidia-smi', { stdio: 'ignore' }); nvidia = true; } catch { /* sem placa NVIDIA */ }
    const encoder = nvidia ? 'nvenc' : 'x264';
    return `[General]\r\nName=CJ LIVE\r\n\r\n[Video]\r\nBaseCX=1080\r\nBaseCY=1920\r\nOutputCX=1080\r\nOutputCY=1920\r\nFPSType=0\r\nFPSCommon=30\r\n\r\n` +
        `[Output]\r\nMode=Simple\r\n\r\n[SimpleOutput]\r\nStreamEncoder=${encoder}\r\nRecEncoder=${encoder}\r\nVBitrate=4500\r\n`;
}

async function setupObs() {
    step(4, 'OBS (transmissão na vertical)');
    const candidates = ['C:/Program Files/obs-studio/bin/64bit/obs64.exe', 'D:/Program Files/obs-studio/bin/64bit/obs64.exe', config.pc.obsExe];
    let exe = candidates.find((p) => p && exists(p));
    if (!exe) {
        warn('OBS não encontrado.');
        if (await yes('Instalar o OBS agora (pelo winget do Windows)?')) {
            spawnSync('winget', ['install', '-e', '--id', 'OBSProject.OBSStudio', '--accept-source-agreements'], { stdio: 'inherit' });
            exe = candidates.find((p) => p && exists(p));
        }
        if (!exe) { warn('Instale o OBS (obsproject.com) e rode o assistente de novo.'); return; }
    }
    ok(`OBS em ${exe}`);
    config.pc.obsExe = exe.replace(/\\/g, '/');
    const base = path.join(process.env.APPDATA, 'obs-studio/basic');
    const sceneFile = path.join(base, 'scenes/CJ LIVE.json');
    const profileDir = path.join(base, 'profiles/CJ LIVE');
    if (exists(sceneFile) && !(await yes('Já existe a cena "CJ LIVE" no OBS. Refazer do zero?'))) {
        config.pc.obsArgs = ['--collection', 'CJ LIVE', '--profile', 'CJ LIVE'];
        return;
    }
    if (!(await yes('Criar no OBS o perfil e a cena "CJ LIVE" prontos (1080x1920, jogo + overlay + som)? Feche o OBS antes.'))) return;
    fs.mkdirSync(path.dirname(sceneFile), { recursive: true });
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(sceneFile, JSON.stringify(obsCollection(), null, 4));
    if (!exists(path.join(profileDir, 'basic.ini'))) fs.writeFileSync(path.join(profileDir, 'basic.ini'), obsProfile());
    config.pc.obsArgs = ['--collection', 'CJ LIVE', '--profile', 'CJ LIVE'];
    ok('Cena e perfil "CJ LIVE" criados. O "Ligar CJ LIVE" já abre o OBS neles.');
    console.log('      Falta só no OBS: Configurações → Transmissão → conectar a sua conta/chave do TikTok.');
}

// ---------- 5. TikTok e IA ----------
async function setupAccounts() {
    step(5, 'TikTok e chave da IA');
    const userFile = path.join(ROOT, 'usuario-tiktok.txt');
    const current = exists(userFile) ? fs.readFileSync(userFile, 'utf8').trim() : '';
    const user = (await ask(`Seu usuário do TikTok${current ? ` (Enter mantém @${current})` : ''}:`)).replace(/^@/, '');
    if (user) fs.writeFileSync(userFile, `${user}\r\n`);
    if (user || current) ok(`Usuário: @${user || current}`);

    const envFile = path.join(ROOT, '.env');
    if (!exists(envFile)) fs.copyFileSync(path.join(ROOT, '.env.example'), envFile);
    let env = fs.readFileSync(envFile, 'utf8');
    const hasKey = /^GEMINI_API_KEY=\S+/m.test(env);
    if (hasKey && !(await yes('A chave da IA já está configurada. Trocar?'))) { ok('Chave da IA mantida'); return; }
    console.log('      A chave é grátis: entre com sua conta Google e clique em "Create API key".');
    if (await yes('Abrir a página da chave agora?')) openUrl('https://aistudio.google.com/apikey');
    const key = await ask('Cole a chave aqui (Enter pula; sem chave o CJ usa falas prontas):');
    if (key) {
        env = /^GEMINI_API_KEY=.*$/m.test(env) ? env.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${key}`) : `${env}\nGEMINI_API_KEY=${key}\n`;
        fs.writeFileSync(envFile, env);
        ok('Chave salva no .env (fica só no seu computador)');
    }
}

// ---------- 6. Voz do CJ (Applio, opcional) ----------
async function setupVoice() {
    step(6, 'Voz do CJ');
    const rvc = config.voice.rvc;
    const dirs = [rvc.applioDir, 'C:/Applio', 'D:/Applio', path.join(os.homedir(), 'Applio')].filter(Boolean);
    const dir = dirs.find((d) => exists(path.join(d, 'env/Scripts/python.exe')));
    let model = null;
    if (dir) {
        try {
            for (const sub of fs.readdirSync(path.join(dir, 'logs'))) {
                const files = fs.readdirSync(path.join(dir, 'logs', sub));
                const pth = files.find((f) => f.endsWith('.pth'));
                if (pth && /cj|carl/i.test(sub + pth)) model = { pth: path.join(dir, 'logs', sub, pth), index: files.find((f) => f.endsWith('.index')) && path.join(dir, 'logs', sub, files.find((f) => f.endsWith('.index'))) };
            }
        } catch { /* sem logs */ }
    }
    if (dir && model) {
        Object.assign(rvc, {
            enabled: true, applioDir: dir.replace(/\\/g, '/'), python: path.join(dir, 'env/Scripts/python.exe').replace(/\\/g, '/'),
            model: model.pth.replace(/\\/g, '/'), index: (model.index || '').replace(/\\/g, '/'),
        });
        ok(`Voz do CJ (Applio) encontrada: ${model.pth}`);
    } else {
        rvc.enabled = false;
        warn('Applio com o modelo do CJ não encontrado: o CJ vai falar com a voz brasileira normal (funciona igual).');
        console.log('      Para o timbre do CJ: instale o Applio e coloque o modelo do CJ em Applio/logs/cj (veja o LEIA-ME).');
    }
}

// ---------- 7. Atalho ----------
function setupShortcut() {
    step(7, 'Atalho na área de trabalho');
    try {
        const target = path.join(ROOT, 'Ligar-CJ-LIVE.cmd');
        const icon = config.pc.gtaDir && exists(path.join(config.pc.gtaDir, 'GTA5.exe')) ? path.join(config.pc.gtaDir, 'GTA5.exe') : '';
        ps(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\\Ligar CJ LIVE.lnk');` +
            `$s.TargetPath='${target.replace(/'/g, "''")}';$s.WorkingDirectory='${ROOT.replace(/'/g, "''")}';` +
            `${icon ? `$s.IconLocation='${icon.replace(/'/g, "''")}';` : ''}$s.Save()`);
        ok('Atalho "Ligar CJ LIVE" criado');
    } catch { warn('Não consegui criar o atalho; use o Ligar-CJ-LIVE.cmd direto.'); }
}

(async () => {
    console.log('\n  ==========  CONFIGURAR A CJ LIVE  ==========');
    console.log('               por AjKaBaL\n');
    console.log('  Vou achar e configurar tudo. Quando eu perguntar, responda S (sim) ou N (não).');
    try {
        const gta = await setupGta();
        await setupMods(gta);
        await setupGtaGraphics();
        await setupObs();
        await setupAccounts();
        await setupVoice();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        if (!process.argv.includes('--sem-atalho')) setupShortcut(); // --sem-atalho: para testes
        fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
        fs.writeFileSync(path.join(ROOT, 'data/configurado.txt'), new Date().toISOString());
        console.log('\n  🎉 Pronto! No menu, escolha [2] Teste para experimentar ou [1] Live.\n');
    } catch (err) {
        console.log(`\n  ❌ Deu erro: ${err.message}\n  Rode de novo pela opção [C] do menu.\n`);
    }
    rl.close();
})();
