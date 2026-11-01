// CJ LIVE — por AjKaBaL
// Menu "Resetar missões": volta as missões para o nível 1, com o progresso zerado.
// Com a live rodando, reseta na hora; desligada, apaga o progresso salvo.

const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const file = path.join(__dirname, '..', 'data', 'missoes.json');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'admin', payload: { cmd: 'reset' } }));
    setTimeout(() => {
        console.log('\n  Missões resetadas na live (nível 1, progresso zerado).\n');
        process.exit(0);
    }, 300);
});
ws.on('error', () => {
    fs.rmSync(file, { force: true });
    console.log('\n  Missões resetadas. Na próxima live elas começam do nível 1.\n');
});
