// CJ LIVE — por AjKaBaL
// Detecta nomes "pegadinha" de duplo sentido (ex.: "Kemel Pinto", "Jacinto Pinto", "Paula Tejano")
// para o CJ não ler em voz alta nem mostrar no overlay. O nome vira "Parceiro".
// Funciona com espaços, pontos, letras repetidas e números no lugar de letras (p1nt0, p.i.n.t.o, piiinto).

// Pedaços proibidos em qualquer lugar do nome (já juntando as palavras): "jacintopinto" tem "pinto"
const PARTS = [
    'pinto', 'piroc', 'caralh', 'porra', 'bucet', 'xoxot', 'xerec', 'cusao', 'cusinh', 'boquet', 'punhet',
    'siriric', 'putinh', 'puton', 'bosta', 'merda', 'penis', 'vagin', 'pentelh', 'tesao', 'gosad', 'gosei',
    'cacet', 'masturb', 'turband', 'peladinh', 'sexo', 'transand', 'foder', 'fodas', 'fudid', 'mamad',
    'chupad', 'chupaminh', 'bunda', 'nudes', 'rabud', 'vadia', 'safad', 'viad', 'bixa', 'paulatejan',
    'deidecost', 'cucabelud', 'comecu', 'metenocu', 'nocu', 'seucu', 'teucu', 'meucu', 'tomanocu',
    'enfianocu', 'sentanele', 'sentanomeu', 'oscaralh', 'dick', 'cock', 'pussy', 'fuck', 'shit', 'boob',
    'nigg', 'niga', 'hitler', 'nazi', 'estupr', 'pedof',
];
// Palavras curtas que só contam sozinhas (senão "Paulo" cairia em "pau")
const WORDS = ['cu', 'pau', 'rola', 'pica', 'pika', 'xota', 'rabo', 'ass', 'cum', 'anal', 'fdp', 'vsf', 'pqp', 'tnc', 'kct', 'krl', 'prr', 'pnc'];

// Normaliza para comparar pelo som: sem acento, minúsculo, números viram letras, k/qu → c, z → s, letras repetidas uma vez só
function normalize(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
        .replace(/@/g, 'a').replace(/\$/g, 's')
        .replace(/qu/g, 'c').replace(/k/g, 'c').replace(/z/g, 's').replace(/y/g, 'i').replace(/w/g, 'v').replace(/ph/g, 'f')
        .replace(/[^a-z ]+/g, ' ')
        .replace(/([a-z])\1+/g, '$1');
}

function createNameCheck(extraParts = []) {
    const parts = [...PARTS, ...extraParts.map((p) => normalize(p).replace(/ /g, ''))];
    const words = new Set(WORDS.map(normalize));
    return function isNaughty(...names) {
        return names.some((name) => {
            const norm = normalize(name);
            const joined = norm.replace(/ /g, '');
            if (parts.some((p) => p && joined.includes(p))) return true;
            return norm.split(' ').some((w) => words.has(w));
        });
    };
}

module.exports = { createNameCheck, normalize, PARTS, WORDS };
