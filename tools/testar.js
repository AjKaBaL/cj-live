// CJ LIVE — por AjKaBaL
// Menu "Testar presentes": manda uma ação para a live que está rodando (jogo + overlay), sem gastar presente.
// Precisa da live ou do teste aberto em outra janela do "Ligar CJ LIVE".

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const WebSocket = require('ws');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
const labels = config.gifts.actionLabels || {};
const actions = Object.keys(labels);

const ws = new WebSocket('ws://localhost:8080');
ws.on('error', () => {
    console.log('\n  A live não está rodando.');
    console.log('  Abra o "Ligar CJ LIVE" em outra janela, escolha Live ou Teste, e volte aqui.\n');
    process.exit(1);
});

ws.on('open', () => {
    console.log('\n  ===== TESTAR PRESENTES =====\n');
    actions.forEach((a, i) => console.log(`  [${String(i + 1).padStart(2)}] ${labels[a]}`));
    console.log('\n  Digite o número da ação (ou 0 para voltar ao menu).');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '  > ' });
    rl.prompt();
    rl.on('line', (line) => {
        const n = Number(line.trim());
        if (n === 0) { ws.close(); process.exit(0); }
        const action = actions[n - 1];
        if (!action) console.log('  Número inválido.');
        else {
            ws.send(JSON.stringify({ type: 'admin', payload: { cmd: 'action', action } }));
            console.log(`  Enviado: ${labels[action]}`);
        }
        rl.prompt();
    });
    rl.on('close', () => process.exit(0));
});
