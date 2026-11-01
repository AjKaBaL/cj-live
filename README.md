# CJ LIVE — por AjKaBaL

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Portugu%C3%AAs-009c3b?style=for-the-badge" alt="Português"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-0a3d91?style=for-the-badge" alt="English"></a>
  <a href="README.es.md"><img src="https://img.shields.io/badge/Espa%C3%B1ol-c60b1e?style=for-the-badge" alt="Español"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/%E4%B8%AD%E6%96%87-de2910?style=for-the-badge" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-bc002d?style=for-the-badge" alt="日本語"></a>
  <a href="README.ru.md"><img src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-0039a6?style=for-the-badge" alt="Русский"></a>
</p>

Live automática do TikTok com o **CJ (Carl Johnson)** andando sozinho pelo GTA V:
ele responde o chat com IA e voz do CJ em português, mexe a boca, reage aos presentes com ações
malucas no jogo, tem missões, metas de curtidas, rankings, moderação e tira fotos para você postar.
Tudo com ferramentas **grátis**.

> Criado por **AjKaBaL**. Pode usar e modificar à vontade; só mantenha os créditos.

---

## ⚠️ Antes de tudo

- **Só no modo história.** Nunca entre no GTA Online com mods: dá ban.
- **Regras do TikTok:** ligue o selo **"Conteúdo gerado por IA"** na live e tenha alguém por perto moderando
  de vez em quando. Live automática sem isso pode ser limitada.
- Os arquivos do CJ (skin, voz, falas originais) **não vêm no pacote**: são de outros criadores/da Rockstar.
  Abaixo está onde baixar cada um.

---

## O que você precisa (tudo grátis)

| O quê | Para quê | Onde |
|---|---|---|
| GTA V **Legacy** (Epic ou Steam) | o jogo | sua conta |
| **Node.js** 22 ou mais novo | roda a CJ LIVE | nodejs.org |
| **ScriptHookV** | carrega mods | dev-c.com/gtav/scripthookv |
| **ScriptHookVDotNet 3** (nightly) | roda o mod do CJ | github.com/scripthookvdotnet/scripthookvdotnet-nightly |
| **OpenIV** | instala a skin do CJ | openiv.com |
| Skin **"CJ Full Replacement"** (xXcalvin54Xx) | transforma o Franklin no CJ | gta5-mods.com |
| **OBS Studio** | transmite a live | obsproject.com |
| Chave do **Gemini** | a IA que responde o chat | aistudio.google.com/apikey |
| *(opcional)* **Applio** + modelo RVC do CJ | voz com o timbre do CJ | github.com/IAHispano/Applio · huggingface.co/binant/CJ__RVC_V2_-_400_Epochs_ |

Sem o Applio a live funciona igual, com uma voz brasileira normal.

---

## Instalação (o assistente faz quase tudo)

1. Baixe aqui no GitHub (botão verde **Code → Download ZIP**) e **extraia** em um lugar fácil (ex.: `D:\CJ LIVE`).
2. Dê dois cliques em **`Ligar-CJ-LIVE.cmd`**.
   - Se não tiver o **Node.js**, ele oferece instalar sozinho (aperte S). Depois abra de novo.
3. Na primeira vez abre o **assistente de configuração**. Responda S ou N e ele:
   - **acha o GTA V** sozinho (Epic, Steam ou pasta) e confere o **ScriptHookV**, o **ScriptHookVDotNet** e a **skin do CJ**
     (se faltar algum, ele abre a página de download e espera você copiar os arquivos);
   - instala o **mod da CJ LIVE** no GTA;
   - deixa o GTA em **janela sem bordas** e sem pausar ao sair da janela;
   - acha (ou instala) o **OBS** e cria o perfil e a cena **"CJ LIVE"** prontos: 1080x1920, jogo + overlay + som;
   - pergunta o seu **usuário do TikTok** e a **chave da IA** (abre a página do Google para você pegar, é grátis);
   - acha a **voz do CJ** (Applio), se você tiver instalado;
   - cria o atalho **"Ligar CJ LIVE"** na área de trabalho.
4. No **OBS**, só falta conectar a sua conta: Configurações → Transmissão.

Quer mudar algo depois? Menu → **[C] Configurar tudo de novo**. Tudo também fica no `config.json`
(parte `"pc"` = caminhos deste computador).

> **O que o assistente não faz por você:** baixar o ScriptHookV e a skin do CJ (os autores não deixam
> redistribuir; ele abre a página e confere depois) e instalar o Applio para o timbre do CJ (opcional; sem ele o CJ
> fala com uma voz brasileira normal).

### Voz do CJ (opcional)

Instale o Applio e coloque o modelo do CJ (`model.pth` e `model.index`) em `Applio\logs\cj\`.
Rode o assistente de novo (opção C) e ele acha sozinho.

---

## Usando

Dois cliques no **Ligar CJ LIVE**:

| Opção | O que faz |
|---|---|
| 1 | **Live de verdade** — abre o GTA e o OBS, conecta no TikTok e religa sozinho se cair |
| 2 | **Teste** — simulador, sem TikTok (digite `chat ana oi cj`, `gift ana Rose 1 1`...) |
| 3 | Ver todos os comandos |
| 4 | **Testar presentes** — escolhe uma ação e ela acontece (com a live ou o teste aberto em outra janela) |
| 5 | Resetar as missões |
| 6 | Top doadores (todas as lives) |
| 7 | Moderação — quem está de castigo, para banir no app |
| 8 | Trocar o usuário do TikTok |
| 9 | Colocar a chave da IA |
| T | **Tutorial** — como começar e parar a transmissão no TikTok |
| C | Configurar tudo de novo (assistente) |
| 0 | Sair |

No jogo, modo história, a pé: **F7** liga a câmera da live e **F8** o piloto automático. Pronto: ele vive sozinho.

> Deixe o GTA **na frente** durante a live: o GTA V corta o som do jogo quando perde o foco (Alt+Tab). Controle o resto pelo celular.

| Tecla no GTA | Função |
|---|---|
| F7 | Câmera da live |
| F8 | Piloto automático |
| F9 | Testa a próxima ação |
| F10 | Status da conexão |
| End / PageUp / PageDown / Delete | Provador de roupa (F5 salva, F6 tira chapéu/óculos) |
| Pause | Teste da boca |
| Insert | Recarrega o mod |

---

## O que tem

- **IA com a personalidade do CJ** (`persona/cj.md`) respondendo o chat em voz, com legenda e a boca mexendo.
- **Presentes** com ações fixas (cards) e sorteadas pelo valor: polícia 4–5 estrelas com AK, Ballas, Grove Street,
  tanque, avião caindo, tornado, chuva de carros/vacas/dinheiro, palhaços, neve, gravidade da Lua, fúria do Trevor...
- **Atitudes de jogador** sozinho: zerinho, rampa, briga, destruir carro, tiro pro alto.
- **Missões** que evoluem, **meta de curtidas** escondida com surpresas, **rankings** e animações no overlay.
- **Pedidos do chat:** se 3 pessoas pedirem "vai na praia", ele vai (só lugares seguros).
- **Falas originais do CJ** (pasta `falas-originais`, você coloca os áudios; veja abaixo como tirar do seu San Andreas).
  Não repetem até tocar todas, e de vez em quando ele solta uma fala solta quando a live está quieta.
- **Moderação:** palavrão/spam = falta; na 3ª vai pro castigo. Nomes pegadinha de duplo sentido viram "Parceiro".
- **Fotos automáticas** em `Imagens\CJ LIVE` (só com o GTA na frente).

Quase tudo se ajusta no `config.json` (cada parte tem um `_comentario` explicando).

### Tirar as falas do CJ do seu GTA San Andreas (opcional)

Precisa do GTA San Andreas **clássico** (Steam) instalado e do Applio (usa o Python e o Whisper dele, na GPU).
Abra o terminal na pasta da CJ LIVE e rode, um de cada vez:

1. Extrair os ~4 mil áudios do CJ: `node tools/sa-audio.js "C:/pasta/do/San Andreas" SPC_PA falas-san-andreas/todas`
2. Transcrever (uns 60 min): `D:/Applio/env/Scripts/python.exe -I tools/sa-transcrever.py falas-san-andreas/todas falas-san-andreas/transcricoes.json`
   (se parar no meio, rode de novo: continua de onde parou)
3. Separar por momento (usa a chave do Gemini do `.env`; tira ofensas e repetição, e "engasga" o f*ck no "fu—"):
   `node tools/sa-separar.js falas-san-andreas/transcricoes.json falas-san-andreas/todas`

As falas vão para `falas-originais/<momento>/`. Depois pode até desinstalar o San Andreas.

---

## Créditos

- **CJ LIVE:** criado por **AjKaBaL** (ideia, código, mod e overlay)
- Skin do CJ: xXcalvin54Xx / Legendario9991 (gta5-mods.com)
- Voz: Applio (IAHispano) + modelo RVC do CJ (binant, Hugging Face) · Microsoft Edge TTS
- tiktok-live-connector (zerodytrash) · ScriptHookV (Alexander Blade) · ScriptHookVDotNet
- GTA V e GTA San Andreas © Rockstar Games
