// CJ LIVE — por AjKaBaL
// Conserta um ped de componentes cujo .ymt lista peças que não vieram no download:
// mantém só os drawables/texturas que existem no disco, renumera os arquivos e reescreve o .ymt no lugar.
// Uso: node fix-ymt.js <pasta do modelo original> <pasta de saída>
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MODEL = 'Carl_Johnson_clasic';
const [srcRoot, outRoot] = process.argv.slice(2);
const srcDir = path.join(srcRoot, MODEL);
const outDir = path.join(outRoot, MODEL);
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(path.join(srcRoot, `${MODEL}.yft`), path.join(outRoot, `${MODEL}.yft`));

const raw = fs.readFileSync(path.join(srcRoot, `${MODEL}.ymt`));
const d = zlib.inflateRawSync(raw.slice(16));
const V = (p) => Number(BigInt.asUintN(64, p) & 0x0fffffffn);
const blocksPtr = V(d.readBigUInt64LE(0x30));
const blocks = [];
for (let i = 0; i < d.readInt16LE(0x4c); i++) {
    const o = blocksPtr + i * 16;
    blocks.push({ off: V(d.readBigUInt64LE(o + 8)) });
}
const arrAt = (o) => {
    const p = d.readBigUInt64LE(o);
    const id = Number(p & 0xfffn);
    return id ? blocks[id - 1].off + Number((p >> 12n) & 0xfffffn) : -1;
};
const setCount = (o, n) => { d.writeUInt16LE(n, o + 8); d.writeUInt16LE(n, o + 10); };
const count = (o) => d.readUInt16LE(o + 8);

const names = ['head', 'berd', 'hair', 'uppr', 'lowr', 'hand', 'feet', 'teef', 'accs', 'task', 'decl', 'jbib'];
const texType = ['uni', 'whi', 'bla', 'chi', 'lat', 'ara', 'bal', 'jap', 'kor', 'ita', 'pak'];
const letters = 'abcdefghijklmnopqrstuvwxyz';
const pad = (n) => String(n).padStart(3, '0');
const disk = new Set(fs.readdirSync(srcDir));

const r = blocks[d.readInt32LE(0x1c) - 1].off;
const compsArr = r + 16;
const comps = arrAt(compsArr);
const remap = {}; // comp -> { velhoIdx: novoIdx }

for (let c = 0; c < 12; c++) {
    const slot = d[r + 4 + c];
    if (slot === 255) continue;
    const co = comps + slot * 24;
    const drArr = co + 8;
    const dr = arrAt(drArr);
    const n = count(drArr);
    const kept = [];
    for (let i = 0; i < n; i++) {
        const o = dr + i * 48;
        const suffix = 'urmm'[(d[o] >> 4) & 3];
        const ydd = `${names[c]}_${pad(i)}_${suffix}.ydd`;
        if (!disk.has(ydd)) continue;
        const tArr = o + 8, t = arrAt(tArr);
        const texFiles = [];
        for (let k = 0; k < count(tArr); k++) {
            const f = `${names[c]}_diff_${pad(i)}_${letters[k]}_${texType[d[t + k * 3]]}.ytd`;
            if (!disk.has(f)) break;
            texFiles.push(f);
        }
        if (!texFiles.length) continue; // peça sem textura derruba o jogo
        const alts = [];
        for (let a = 1; a <= d[o + 1]; a++) {
            const f = `${names[c]}_${pad(i)}_${suffix}_${a}.ydd`;
            if (!disk.has(f)) break;
            alts.push(f);
        }
        kept.push({ i, o, suffix, ydd, texFiles, alts, struct: Buffer.from(d.slice(o, o + 48)) });
    }
    remap[c] = {};
    let totalTex = 0;
    kept.forEach((k, j) => {
        k.struct.copy(d, dr + j * 48);
        const o = dr + j * 48;
        d[o + 1] = k.alts.length;              // numAlternatives
        setCount(o + 8, k.texFiles.length);     // aTexData
        d[o + 24] = 0;                          // ownsCloth: não temos .yld
        totalTex += k.texFiles.length;
        remap[c][k.i] = j;
        const ren = (f) => f.replace(`${names[c]}_${pad(k.i)}_`, `${names[c]}_${pad(j)}_`).replace(`_diff_${pad(k.i)}_`, `_diff_${pad(j)}_`);
        for (const f of [k.ydd, ...k.alts, ...k.texFiles]) fs.copyFileSync(path.join(srcDir, f), path.join(outDir, ren(f)));
    });
    setCount(drArr, kept.length);
    d[co] = totalTex; // numAvailTex
    console.log(`${names[c]}: ${n} no ymt -> ${kept.length} mantidos (${kept.map((k) => k.i).join(',')})`);
    if (!kept.length) d[r + 4 + c] = 255; // componente sem nenhuma peça
}
// Se o último slot ficou vazio, encolhe o array de componentes
const usedSlots = [...d.slice(r + 4, r + 16)].filter((s) => s !== 255);
setCount(compsArr, Math.max(...usedSlots) + 1);

// compInfos: um por drawable; mantém só os que sobraram e reindexa
const ciArr = r + 48, ci = arrAt(ciArr);
const keptInfos = [];
for (let i = 0; i < count(ciArr); i++) {
    const o = ci + i * 48, c = d[o + 44], di = d[o + 45];
    if (remap[c] && remap[c][di] !== undefined && d[r + 4 + c] !== 255) {
        const s = Buffer.from(d.slice(o, o + 48));
        s[45] = remap[c][di];
        keptInfos.push(s);
    }
}
keptInfos.forEach((s, j) => s.copy(d, ci + j * 48));
setCount(ciArr, keptInfos.length);
console.log(`compInfos: ${keptInfos.length}`);

// Sem props (não vieram p_*.ydd) e sem conjuntos de seleção
setCount(r + 32, 0);          // aSelectionSets
d[r + 64] = 0;                // propInfo.numAvailProps
setCount(r + 64 + 8, 0);      // aPropMetaData
setCount(r + 64 + 24, 0);     // aAnchors

const out = Buffer.concat([raw.slice(0, 16), zlib.deflateRawSync(d, { level: 9 })]);
fs.writeFileSync(path.join(outRoot, `${MODEL}.ymt`), out);
fs.writeFileSync(path.join(outRoot, 'ymt-decoded.bin'), d);
console.log('ymt reescrito');
