// CJ LIVE — por AjKaBaL
// Gera "CJ-LIVE-Carl-Johnson.oiv": pacote do OpenIV que instala o CJ como personagem add-on
// (dlcpacks/cjlive) e registra o pacote no dlclist.xml. Instalação: dois cliques no .oiv → "Install" → "mods folder".
//
// Uso: node gta-mod/cj-ped/build-oiv.js <pasta extraída do mod do CJ> [gameconfig.xml]
//      (a pasta que contém Carl_Johnson_clasic.yft, .ymt e a subpasta Carl_Johnson_clasic)
//      O gameconfig.xml opcional (ex.: F7YO) aumenta os limites do jogo; sem ele a build 3889 fecha ao carregar.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const MODEL = 'Carl_Johnson_clasic';
const srcDir = process.argv[2];
const gameconfig = process.argv[3];
if (!srcDir || !fs.existsSync(path.join(srcDir, `${MODEL}.yft`))) {
    console.error(`Informe a pasta com ${MODEL}.yft`);
    process.exit(1);
}

const here = __dirname;
const out = path.join(here, 'build');
const stage = path.join(out, 'oiv');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'content'), { recursive: true });

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function stageFile(from, contentPath) {
    const dest = path.join(stage, 'content', contentPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(from, dest);
}

// Arquivos do DLC (content.xml, setup2.xml, peds.meta)
const dlcFiles = ['content.xml', 'setup2.xml', 'common/data/peds.meta'];
dlcFiles.forEach((f) => stageFile(path.join(here, 'dlc', f), path.join('dlc', f)));

// Arquivos do modelo: .yft/.ymt na raiz + a pasta de componentes
const modelFiles = [`${MODEL}.yft`, `${MODEL}.ymt`];
for (const f of fs.readdirSync(path.join(srcDir, MODEL))) modelFiles.push(`${MODEL}/${f}`);
modelFiles.forEach((f) => stageFile(path.join(srcDir, f), path.join('peds', f)));
if (gameconfig) stageFile(gameconfig, 'gameconfig.xml');

const win = (p) => p.replace(/\//g, '\\');
const assembly = `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.2" id="{8C3F2B1A-6D4E-4F7A-9B21-0C1A00000001}" target="Five">
  <metadata>
    <name>CJ LIVE - Carl Johnson (Add-On Ped)</name>
    <version>
      <major>1</major>
      <minor>0</minor>
      <tag>CJLIVE</tag>
    </version>
    <author>
      <displayName>CJ LIVE (modelo: Legendario9991)</displayName>
    </author>
    <description footerLink="https://www.gta5-mods.com" footerLinkTitle="gta5-mods"><![CDATA[Instala o Carl Johnson CLASSIC HD como personagem add-on "${MODEL}" (dlcpacks/cjlive).
Modelo por Legendario9991 / EZEKIEL_RN (gta5-mods.com). Instale na pasta "mods".]]></description>
  </metadata>
  <colors>
    <headerBackground useBlackTextColor="False">$FF1E8C2E</headerBackground>
    <iconBackground>$FF1E8C2E</iconBackground>
  </colors>
  <content>
    <archive path="update\\update.rpf" createIfNotExist="False" type="RPF7">
      <xml path="common\\data\\dlclist.xml" createIfNotExist="False">
        <add xpath="//Paths" append="Last"><Item>dlcpacks:/cjlive/</Item></add>
      </xml>${gameconfig ? '\n      <add source="gameconfig.xml">common\\data\\gameconfig.xml</add>' : ''}
    </archive>
    <archive path="update\\x64\\dlcpacks\\cjlive\\dlc.rpf" createIfNotExist="True" type="RPF7">
${dlcFiles.map((f) => `      <add source="${xml(win(`dlc/${f}`))}">${xml(win(f))}</add>`).join('\n')}
      <archive path="x64\\streamedpeds_cjlive.rpf" createIfNotExist="True" type="RPF7">
${modelFiles.map((f) => `        <add source="${xml(win(`peds/${f}`))}">${xml(win(f))}</add>`).join('\n')}
      </archive>
    </archive>
  </content>
</package>
`;
fs.writeFileSync(path.join(stage, 'assembly.xml'), assembly);
fs.writeFileSync(path.join(stage, 'icon.png'), solidPng(128, 128, [30, 140, 46]));

// O .oiv é um zip comum
const oiv = path.join(out, 'CJ-LIVE-Carl-Johnson.oiv');
fs.rmSync(oiv, { force: true });
execFileSync('7z', ['a', '-tzip', '-mx=5', oiv, '.\\*'], { cwd: stage, stdio: 'ignore' });
console.log(`Pacote gerado: ${oiv} (${modelFiles.length} arquivos do modelo)`);

// PNG de uma cor só (ícone do pacote)
function solidPng(w, h, [r, g, b]) {
    const crcTable = Array.from({ length: 256 }, (_, n) => {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        return c >>> 0;
    });
    const crc = (buf) => {
        let c = 0xffffffff;
        for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    };
    const chunk = (type, data) => {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const body = Buffer.concat([Buffer.from(type), data]);
        const sum = Buffer.alloc(4);
        sum.writeUInt32BE(crc(body));
        return Buffer.concat([len, body, sum]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB
    const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())]);
    const raw = Buffer.concat(Array.from({ length: h }, () => row));
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}
