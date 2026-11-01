// CJ LIVE — por AjKaBaL
// Usado pelo "Ligar CJ LIVE": instala/atualiza o mod no GTA e abre o GTA V e o OBS (se ainda não estiverem abertos).
// Os caminhos ficam em config.json -> pc.
// Uso: node tools/abrir.js           (instala o mod + abre GTA e OBS)
//      node tools/abrir.js --so-mod  (só instala o mod; é o "npm run mod")

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
const pc = config.pc || {};

// Mod: copia gta-mod/CjLive.cs para <GTA>/scripts/CjLive.3.cs (o ".3" = API v3 do ScriptHookVDotNet)
function installMod() {
    const scripts = path.join(pc.gtaDir || 'D:/GTAV', 'scripts');
    if (!fs.existsSync(pc.gtaDir || 'D:/GTAV')) {
        console.log(`  ⚠️  Pasta do GTA não encontrada (${pc.gtaDir}). Ajuste "pc.gtaDir" no config.json.`);
        return;
    }
    const from = path.join(__dirname, '..', 'gta-mod', 'CjLive.cs');
    const to = path.join(scripts, 'CjLive.3.cs');
    fs.mkdirSync(scripts, { recursive: true });
    const same = fs.existsSync(to) && fs.readFileSync(to).equals(fs.readFileSync(from));
    if (!same) {
        fs.copyFileSync(from, to);
        console.log(`  Mod instalado em ${to}`);
    }
}

const running = (exe) => {
    try { return execSync(`tasklist /fi "imagename eq ${exe}"`, { encoding: 'utf8' }).toLowerCase().includes(exe.toLowerCase()); }
    catch { return false; }
};

// Link da Epic/Steam (com.epicgames..., steam://...) abre pelo Windows; caminho de .exe abre direto
function open(target, args = []) {
    if (/^[a-z][\w.+-]*:\/\//i.test(target)) {
        // entre aspas e sem o Node mexer: o "&" do link da Epic não pode ser lido pelo cmd
        spawn('cmd.exe', ['/c', `start "" "${target}"`], { detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true }).unref();
    } else {
        spawn(target, args, { cwd: path.dirname(target), detached: true, stdio: 'ignore' }).unref();
    }
}

installMod();
if (process.argv.includes('--so-mod')) process.exit(0);

if (pc.gtaLaunch && !running('GTA5.exe')) {
    console.log('  Abrindo o GTA V...');
    open(pc.gtaLaunch);
}
// O OBS precisa abrir de dentro da própria pasta
if (pc.obsExe && fs.existsSync(pc.obsExe) && !running('obs64.exe')) {
    console.log('  Abrindo o OBS...');
    open(pc.obsExe, pc.obsArgs || []); // obsArgs: abre direto na cena/perfil "CJ LIVE" do assistente
}
