// CJ LIVE — por AjKaBaL
// Faz uma peça do CJClassic usar os dados de outra (ex.: cabelo 6 vira a peça vazia jbib_000_u,
// deixando o CJ careca). Só reescreve a entrada do índice do RPF: posição, tamanho e flags.
// Uso: node alias-piece.js <dlc.rpf> <peça alvo como está no índice> <nome final> <peça origem>
//  ex: node alias-piece.js dlc.rpf hair_005_u.ydx hair_005_u.ydd jbib_000_u.ydd
const fs = require('fs');

const [file, target, finalName, source] = process.argv.slice(2);
if (target.length !== finalName.length) throw new Error('o nome final precisa ter o mesmo tamanho');
const fd = fs.openSync(file, 'r+');

function readToc(base) {
    const h = Buffer.alloc(16);
    fs.readSync(fd, h, 0, 16, base);
    if (h.toString('latin1', 0, 4) !== '7FPR') throw new Error('não é RPF7');
    const count = h.readUInt32LE(4), raw = h.readUInt32LE(8);
    const t = Buffer.alloc(count * 16 + (raw & 0x0fffffff));
    fs.readSync(fd, t, 0, t.length, base + 16);
    const names = t.slice(count * 16), shift = raw >>> 28;
    const entries = [];
    for (let i = 0; i < count; i++) {
        const o = i * 16;
        if (t.readUInt32LE(o + 4) === 0x7fffff00) continue;
        const off = t.readUInt16LE(o) << shift;
        entries.push({ i, name: names.toString('latin1', off, names.indexOf(0, off)), nameAt: base + 16 + count * 16 + off, at: base + 16 + o, raw: t.slice(o, o + 16) });
    }
    return entries;
}

const top = readToc(0).find((e) => e.name === 'streamedpeds_players.rpf');
if (!top) throw new Error('streamedpeds_players.rpf não encontrado');
const inner = readToc((top.raw.readUIntLE(5, 3) & 0x7fffff) * 512);
const src = inner.find((e) => e.name === source);
const dst = inner.find((e) => e.name === target);
if (!src || !dst) throw new Error('não achei ' + (!src ? source : target));

// Mantém o nome (2 bytes) do alvo; copia tamanho, posição e flags da origem
const entry = Buffer.from(src.raw);
dst.raw.copy(entry, 0, 0, 2);
fs.writeSync(fd, entry, 0, 16, dst.at);
fs.writeSync(fd, Buffer.from(finalName, 'latin1'), 0, finalName.length, dst.nameAt);
fs.closeSync(fd);
console.log(`${target} -> ${finalName} (dados de ${source})`);
