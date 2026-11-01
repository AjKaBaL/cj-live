// CJ LIVE — por AjKaBaL
// Lê o .ymt de um ped de componentes (formato Meta/RSC7) e lista drawables e texturas esperados.
const fs = require('fs');
const zlib = require('zlib');
const b = fs.readFileSync(process.argv[2]);
const d = zlib.inflateRawSync(b.slice(16));
const V = (p) => Number(BigInt.asUintN(64, p) & 0x0fffffffn); // ponteiro virtual -> offset

const blocksPtr = V(d.readBigUInt64LE(0x30));
const nBlocks = d.readInt16LE(0x4c);
const root = d.readInt32LE(0x1c);
const blocks = [];
for (let i = 0; i < nBlocks; i++) {
    const o = blocksPtr + i * 16;
    blocks.push({ hash: d.readUInt32LE(o), len: d.readInt32LE(o + 4), off: V(d.readBigUInt64LE(o + 8)) });
}
console.log('blocks', blocks.map((x, i) => `${i}:${x.hash.toString(16)}/${x.len}`).join(' '), 'root', root);

// Array_Structure: Pointer(u64: id em 12 bits + offset<<12), Count1, Count2
const arr = (o) => {
    const p = d.readBigUInt64LE(o);
    const id = Number(p & 0xfffn), off = Number((p >> 12n) & 0xfffffn);
    return { count: d.readUInt16LE(o + 8), at: id ? blocks[id - 1].off + off : -1 };
};
const names = ['head', 'berd', 'hair', 'uppr', 'lowr', 'hand', 'feet', 'teef', 'accs', 'task', 'decl', 'jbib'];
const tex = ['uni', 'whi', 'bla', 'chi', 'lat', 'ara', 'bal', 'jap', 'kor', 'ita', 'pak'];
const r = blocks[root - 1].off;
const flags = [...d.slice(r, r + 4)];
const avail = [...d.slice(r + 4, r + 16)];
console.log('flags', flags, 'availComp', avail);
const comps = arr(r + 16);
const expected = [];
for (let c = 0; c < 12; c++) {
    if (avail[c] === 255) continue;
    const co = comps.at + avail[c] * 24;
    const numTex = d[co];
    const dr = arr(co + 8);
    const line = [];
    for (let i = 0; i < dr.count; i++) {
        const o = dr.at + i * 48;
        const propMask = d[o], alts = d[o + 1];
        const t = arr(o + 8);
        const ptype = (propMask >> 4) & 3;
        const name = `${names[c]}_${String(i).padStart(3, '0')}_${'urmm'[ptype]}`;
        const texs = [];
        for (let k = 0; k < t.count; k++) texs.push(`${names[c]}_diff_${String(i).padStart(3, '0')}_${'abcdefghijklmnopqrstuvwxyz'[k]}_${tex[d[t.at + k * 3]] ?? '?'}`);
        const cloth = d[o + 24];
        expected.push(name, ...texs);
        line.push(`${name}(mask ${propMask}, alt ${alts}, tex ${t.count}${cloth ? ', cloth' : ''})`);
    }
    console.log(`${names[c]} [slot ${avail[c]}] numAvailTex ${numTex}, drawables ${dr.count}:\n  ` + line.join('\n  '));
}
if (process.argv[3]) {
    const have = new Set(fs.readdirSync(process.argv[3]).map((f) => f.replace(/\.(ydd|ytd)$/, '')));
    console.log('\nFALTANDO no disco:', expected.filter((n) => !have.has(n)).join(' ') || 'nenhum');
    const exp = new Set(expected);
    console.log('SOBRANDO no disco:', [...have].filter((n) => !exp.has(n)).join(' ') || 'nenhum');
}
