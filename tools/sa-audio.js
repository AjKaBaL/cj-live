// CJ LIVE — por AjKaBaL
// Extrai as falas do GTA San Andreas (versão clássica) para .wav. Lê o formato dos bancos de som do jogo:
//   audio/CONFIG/PakFiles.dat  nomes dos arquivos (52 bytes cada)
//   audio/CONFIG/BankLkup.dat  bancos: { arquivo (1 byte) + 3 vazios, posição (4), tamanho (4) }
//   cada banco: nº de sons (2) + 2 vazios + 400 × { posição (4), loop (4), taxa (2), volume (2) } e o áudio PCM 16 bits mono
// Uso: node tools/sa-audio.js "<pasta do San Andreas>" <SPC_PA> <pasta de saída> [banco inicial] [qtd de bancos]

const fs = require('fs');
const path = require('path');

const [gameDir, pakName = 'SPC_PA', outDir = 'sa-falas', firstBank, bankCount] = process.argv.slice(2);
if (!gameDir) { console.error('Informe a pasta do GTA San Andreas'); process.exit(1); }

const cfg = path.join(gameDir, 'audio', 'CONFIG');
const pakFile = fs.readFileSync(path.join(cfg, 'PakFiles.dat'));
const paks = [];
for (let i = 0; i + 52 <= pakFile.length; i += 52) paks.push(pakFile.toString('latin1', i, i + 52).replace(/\0.*$/s, ''));
const pakIndex = paks.findIndex((p) => p.toUpperCase() === pakName.toUpperCase());
if (pakIndex < 0) { console.error(`Não achei ${pakName}. Arquivos: ${paks.join(', ')}`); process.exit(1); }

const lookup = fs.readFileSync(path.join(cfg, 'BankLkup.dat'));
const banks = [];
for (let i = 0; i + 12 <= lookup.length; i += 12) {
    if (lookup[i] === pakIndex) banks.push({ offset: lookup.readUInt32LE(i + 4), size: lookup.readUInt32LE(i + 8) });
}

function wav(pcm, rate) {
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
    h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
    h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([h, pcm]);
}

const fd = fs.openSync(path.join(gameDir, 'audio', 'SFX', paks[pakIndex]), 'r');
fs.mkdirSync(outDir, { recursive: true });
const start = Number(firstBank) || 0;
const end = bankCount ? Math.min(banks.length, start + Number(bankCount)) : banks.length;
let total = 0;
for (let b = start; b < end; b++) {
    const bank = banks[b];
    const header = Buffer.alloc(4804);
    fs.readSync(fd, header, 0, 4804, bank.offset);
    const count = header.readUInt16LE(0);
    const sounds = [];
    for (let s = 0; s < count && s < 400; s++) {
        const o = 4 + s * 12;
        sounds.push({ offset: header.readUInt32LE(o), rate: header.readUInt16LE(o + 8) });
    }
    const dataSize = bank.size - 4804;
    for (let s = 0; s < sounds.length; s++) {
        const len = (s + 1 < sounds.length ? sounds[s + 1].offset : dataSize) - sounds[s].offset;
        if (len <= 0 || !sounds[s].rate) continue;
        const pcm = Buffer.alloc(len);
        fs.readSync(fd, pcm, 0, len, bank.offset + 4804 + sounds[s].offset);
        fs.writeFileSync(path.join(outDir, `${paks[pakIndex]}_${String(b).padStart(3, '0')}_${String(s).padStart(3, '0')}.wav`), wav(pcm, sounds[s].rate));
        total++;
    }
}
console.log(`${paks[pakIndex]}: ${banks.length} bancos, extraí ${total} sons (bancos ${start}–${end - 1}) em ${outDir}`);
