// CJ LIVE — por AjKaBaL
// Mostra todos os comandos da CJ LIVE (teclas do jogo, simulador, presentes e missões).
// Os presentes e missões vêm do config.json, então a lista está sempre atualizada.

const config = require('../config.json');

const label = (a) => config.gifts.actionLabels?.[a] || a;
const line = (k, v) => console.log(`   ${k.padEnd(22)} ${v}`);
const title = (t) => console.log(`\n ── ${t} ${'─'.repeat(Math.max(0, 56 - t.length))}`);

title('TECLAS NO GTA');
line('F7', 'Liga/desliga a câmera da live');
line('F8', 'Liga/desliga o piloto automático (o CJ anda sozinho)');
line('F9', 'Testa a próxima ação de presente');
line('F10', 'Status da conexão com a CJ LIVE');
line('F11', 'Troca de modelo (desligado: o Franklin já é o CJ)');
line('End / Shift+End', 'Provador: escolhe a parte do corpo');
line('PageUp / PageDown', 'Provador: troca a peça');
line('Delete', 'Provador: troca a cor');
line('F6', 'Tira chapéu e óculos');
line('F5', 'Salva a roupa');
line('Insert', 'Recarrega o mod sem fechar o jogo');
line('Pause', 'Teste da boca (3 jeitos, 5 s cada)');

title('SIMULADOR (opção 2, digite depois do ">")');
line('chat ana oi cj', 'A "ana" manda "oi cj" no chat');
line('gift ana Rose 1 1', 'Presente: nome, quantidade, diamantes de cada');
line('like ana 50', '50 curtidas da ana');
line('follow ana', 'A ana segue a live');
line('sair', 'Fecha o simulador');

title('PRESENTES COM AÇÃO FIXA');
for (const [gift, a] of Object.entries(config.gifts.actions)) line(gift, a.label || label(a.action));

title('OUTROS PRESENTES (ação sorteada pelo valor)');
for (const t of config.gifts.tiers) line(`${t.minDiamonds}+ diamantes`, t.actions.map(label).join(', '));

title(`MISSÕES DA GALERA (${config.missions.slots || 2} na tela por vez, sorteadas)`);
const unit = { likes: 'curtidas', diamonds: 'diamantes', follows: 'seguidores', chats: 'comentários' };
for (const m of config.missions.pool) line(`${m.goal} ${unit[m.kind] || m.kind}`, `${m.name} → ${label(m.action)}`);
console.log(`\n   Ao completar, a meta cresce ${config.missions.growth}x e a missão evolui ou troca por outra.`);

if (config.places?.list?.length) {
    title(`PEDIDOS DO CHAT (${config.places.votesNeeded} pessoas pedindo o mesmo lugar em ${config.places.windowSec}s)`);
    for (const p of config.places.list) line(p.words.slice(0, 3).join(' / '), `CJ vai ${p.name}`);
}
console.log('');
