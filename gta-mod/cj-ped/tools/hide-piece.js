// CJ LIVE — por AjKaBaL
// Esconde peças do CJClassic (dlc.rpf sem criptografia) trocando a extensão no índice do RPF:
// "hair_000_u.ydd" vira "hair_000_u.ydx" e o jogo usa a peça original do Franklin no lugar.
// A troca mantém o tamanho e a ordem dos nomes, então o arquivo continua válido.
// Uso: node hide-piece.js <dlc.rpf> <nome1> [nome2...]      (ex.: hair_000_u.ydd hair_diff_000_a_uni.ytd)
//      node hide-piece.js <dlc.rpf> --undo <nome1> ...       (volta ao normal)
const fs = require('fs');

const [file, ...rest] = process.argv.slice(2);
const undo = rest[0] === '--undo';
const names = undo ? rest.slice(1) : rest;
const fd = fs.openSync(file, 'r+');

// Acha o RPF aninhado streamedpeds_players.rpf dentro do dlc.rpf
function header(base) {
    const h = Buffer.alloc(16);
    fs.readSync(fd, h, 0, 16, base);
    if (h.toString('latin1', 0, 4) !== '7FPR') throw new Error('não é RPF7');
    const count = h.readUInt32LE(4), raw = h.readUInt32LE(8);
    return { count, namesLen: raw & 0x0fffffff, shift: raw >>> 28 };
}
function toc(base) {
    const { count, namesLen } = header(base);
    const t = Buffer.alloc(count * 16 + namesLen);
    fs.readSync(fd, t, 0, t.length, base + 16);
    return { t, count, namesAt: base + 16 + count * 16 };
}
const top = toc(0);
const topNames = top.t.slice(top.count * 16);
let inner = -1;
for (let i = 0; i < top.count; i++) {
    const o = i * 16;
    if (top.t.readUInt32LE(o + 4) === 0x7fffff00) continue;
    const nameOff = top.t.readUInt16LE(o) << header(0).shift;
    const name = topNames.toString('latin1', nameOff, topNames.indexOf(0, nameOff));
    if (name === 'streamedpeds_players.rpf') inner = (top.t.readUIntLE(o + 5, 3) & 0x7fffff) * 512;
}
if (inner < 0) throw new Error('streamedpeds_players.rpf não encontrado');

const { t, count, namesAt } = toc(inner);
const table = t.slice(count * 16);
for (const n of names) {
    const from = undo ? n.slice(0, -1) + 'x' : n;
    const to = undo ? n : n.slice(0, -1) + 'x';
    const needle = Buffer.from('\0' + from + '\0', 'latin1');
    const at = table.indexOf(needle);
    if (at < 0) { console.log('não achei', from); continue; }
    fs.writeSync(fd, Buffer.from(to, 'latin1'), 0, to.length, namesAt + at + 1);
    console.log(from, '->', to);
}
fs.closeSync(fd);
