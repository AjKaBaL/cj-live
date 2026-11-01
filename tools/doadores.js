// CJ LIVE — por AjKaBaL
// Menu "Top doadores": quem mais mandou diamantes somando todas as lives (data/doadores.json).

const fs = require('fs');
const path = require('path');

let donors = {};
try { donors = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'doadores.json'), 'utf8')); } catch { /* nenhum ainda */ }

const top = Object.entries(donors).sort((a, b) => b[1].diamonds - a[1].diamonds).slice(0, 20);
console.log('\n  ===== TOP DOADORES (todas as lives) =====\n');
if (!top.length) console.log('  Ninguém mandou presente com diamantes ainda.');
top.forEach(([id, d], i) => {
    const medal = ['🥇', '🥈', '🥉'][i] || '  ';
    console.log(`  ${medal} ${String(i + 1).padStart(2)}º  ${d.name} (@${id})`.padEnd(48) + `${d.diamonds.toLocaleString('pt-BR')} 💎`);
});
console.log('');
