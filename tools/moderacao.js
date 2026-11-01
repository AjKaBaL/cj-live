// CJ LIVE — por AjKaBaL
// Menu "Moderação": quem está de castigo (falou besteira 3 vezes) e quem já levou advertência.
// O ban de verdade é no app do TikTok; aqui fica a lista com o @ e o que a pessoa escreveu.
// Uso: node tools/moderacao.js          (mostra a lista)
//      node tools/moderacao.js --limpar (zera a lista; faça com a live desligada)

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'moderacao.json');

if (process.argv.includes('--limpar')) {
    fs.rmSync(file, { force: true });
    console.log('\n  Lista de moderação zerada.\n');
    process.exit(0);
}

let list = {};
try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* vazia */ }
const entries = Object.entries(list).sort((a, b) => Number(b[1].muted) - Number(a[1].muted) || b[1].strikes - a[1].strikes);

console.log('\n  ===== MODERAÇÃO =====\n');
if (!entries.length) console.log('  Ninguém foi advertido ainda. 👍');
for (const [id, e] of entries) {
    console.log(`  ${e.muted ? '🚫 CASTIGO ' : '⚠️  AVISO   '} @${id}  (${e.name})  ${e.strikes} falta(s)  ${e.at || ''}`);
    for (const m of e.messages || []) console.log(`               "${m}"`);
}
if (entries.some(([, e]) => e.muted)) {
    console.log(`
  Para BANIR no TikTok (durante a live, pelo celular):
    toque no comentário ou no nome da pessoa → "Bloquear" (ou "Silenciar").
  Dica: em Configurações da LIVE → "Moderadores", adicione um amigo de confiança
  para ajudar, e em "Filtrar comentários" ligue o filtro de palavras.`);
}
console.log('');
