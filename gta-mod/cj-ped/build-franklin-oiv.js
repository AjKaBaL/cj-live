// CJ LIVE — por AjKaBaL
// Gera "CJ-LIVE-Franklin-vira-CJ.oiv": transforma o Franklin no CJ usando o dlcpack CJClassic
// do mod "CJ Full Replacement" (xXcalvin54Xx / Legendario9991), sem as telas, músicas e
// arquivos de interface antigos que vinham junto. Instale na pasta "mods".
//
// Uso: node gta-mod/cj-ped/build-franklin-oiv.js <CJClassic dlc.rpf> <peds.ymt do mod> [gameconfig.xml]
// O dlc.rpf (1,4 GB) não entra no .oiv: o OpenIV falha sem log com ele. Copie-o à mão para
// <GTA>\mods\update\x64\dlcpacks\CJClassic\dlc.rpf; o .oiv só mexe no update.rpf.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [dlcRpf, pedsYmt, gameconfig] = process.argv.slice(2);
if (!dlcRpf || !fs.existsSync(dlcRpf) || !pedsYmt || !fs.existsSync(pedsYmt)) {
    console.error('Informe o dlc.rpf do CJClassic e o peds.ymt do mod');
    process.exit(1);
}

const out = path.join(__dirname, 'build');
const stage = path.join(out, 'oiv-franklin');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'content'), { recursive: true });
const put = (from, name) => fs.copyFileSync(from, path.join(stage, 'content', name));
put(pedsYmt, 'peds.ymt');
if (gameconfig) put(gameconfig, 'gameconfig.xml');

const assembly = `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.2" id="{8C3F2B1A-6D4E-4F7A-9B21-0C1A00000002}" target="Five">
  <metadata>
    <name>CJ LIVE - Franklin vira CJ</name>
    <version>
      <major>1</major>
      <minor>0</minor>
      <tag>CJLIVE</tag>
    </version>
    <author>
      <displayName>CJ LIVE (modelo: Legendario9991 / xXcalvin54Xx)</displayName>
    </author>
    <description footerLink="https://www.gta5-mods.com/player/carl-johnson-audio-replacement-overhaul-for-franklin" footerLinkTitle="gta5-mods"><![CDATA[Troca o modelo do Franklin pelo CJ (dlcpack CJClassic).
Só o modelo e o peds.ymt do mod original; sem telas, músicas ou interface. Instale na pasta "mods".]]></description>
  </metadata>
  <colors>
    <headerBackground useBlackTextColor="False">$FF1E8C2E</headerBackground>
    <iconBackground>$FF1E8C2E</iconBackground>
  </colors>
  <content>
    <archive path="update\\update.rpf" createIfNotExist="False" type="RPF7">
      <xml path="common\\data\\dlclist.xml" createIfNotExist="False">
        <add xpath="//Paths" append="Last"><Item>dlcpacks:/CJClassic/</Item></add>
      </xml>
      <add source="peds.ymt">x64\\data\\peds.ymt</add>${gameconfig ? '\n      <add source="gameconfig.xml">common\\data\\gameconfig.xml</add>' : ''}
    </archive>
  </content>
</package>
`;
fs.writeFileSync(path.join(stage, 'assembly.xml'), assembly);
fs.copyFileSync(path.join(out, 'oiv', 'icon.png'), path.join(stage, 'icon.png'));

const oiv = path.join(out, 'CJ-LIVE-Franklin-vira-CJ.oiv');
fs.rmSync(oiv, { force: true });
execFileSync('7z', ['a', '-tzip', '-mx=0', oiv, '.\\*'], { cwd: stage, stdio: 'ignore' });
console.log(`Pacote gerado: ${oiv}`);
