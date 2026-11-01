// CJ LIVE — por AjKaBaL
// Menu "Tutorial": como começar e parar a transmissão no TikTok do jeito certo.

const t = (s) => console.log(s);
t(`
  ==========  COMO TRANSMITIR NO TIKTOK  ==========

  ANTES DA PRIMEIRA LIVE (uma vez só)
  ------------------------------------
  O TikTok só deixa transmitir pelo PC quem tem acesso à LIVE (em geral, conta com
  18+ anos e uns 1.000 seguidores). Há dois jeitos:

  JEITO A - Chave de transmissão (melhor, a imagem sai direto do OBS)
    1. Entre em  https://livecenter.tiktok.com  (ou no app TikTok LIVE Studio)
       e procure "Chave de transmissão" / "Stream key". Se aparecer, use este jeito.
    2. Copie a "URL do servidor" e a "Chave de transmissão".
    3. No OBS: Configurações > Transmissão > Serviço "Personalizado"
       > cole a URL no Servidor e a chave em Chave de transmissão > OK.
    ! A chave costuma mudar a cada live: confira antes de começar.

  JEITO B - TikTok LIVE Studio (se não tiver chave)
    1. Instale o TikTok LIVE Studio e entre na sua conta.
    2. No OBS, clique em "Iniciar câmera virtual".
    3. No LIVE Studio, adicione a fonte "Câmera" e escolha "OBS Virtual Camera",
       com o layout na VERTICAL, e encaixe na tela toda.

  LIGAR A LIVE (nesta ordem)
  --------------------------
    1. Ligar CJ LIVE > [1] Live de verdade. Espere aparecer "Voz do CJ pronta".
       (Antes disso, a janela também precisa mostrar que conectou na sua live.)
    2. No GTA (modo história): F7 liga a câmera e F8 o piloto automático.
       Deixe o GTA NA FRENTE e não dê Alt+Tab: o GTA corta o som sem foco.
       Controle o resto pelo celular.
    3. OBS: "Iniciar transmissão" (jeito A) ou LIVE Studio: "Entrar ao vivo" (jeito B).
    4. Ligue o selo "Conteúdo gerado por IA" nas opções da LIVE.

  IMPORTANTE: a CJ LIVE lê o chat da sua live, então a live precisa estar NO AR
  para ela conectar. Se você ligou a CJ LIVE antes, ela fica tentando sozinha até a
  live começar (ou feche e abra de novo depois que a live começar).

  PARAR A LIVE (nesta ordem)
  --------------------------
    1. No TikTok (celular, Live Center ou LIVE Studio): "Encerrar LIVE".
    2. No OBS: "Parar transmissão" (e "Parar câmera virtual", se usou).
    3. Na janela da CJ LIVE: aperte Ctrl+C (ou feche a janela).
    4. Feche o GTA e o OBS.

  DICAS
    - Teste antes com [2] Teste (simulador) para ver o overlay e a voz no OBS.
    - Se a imagem ficar preta no OBS, tire e coloque de novo a "Captura de jogo".
    - Fique de olho no chat pelo celular para moderar quando precisar.
`);
