# CJ LIVE — por AjKaBaL

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Portugu%C3%AAs-009c3b?style=for-the-badge" alt="Português"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-0a3d91?style=for-the-badge" alt="English"></a>
  <a href="README.es.md"><img src="https://img.shields.io/badge/Espa%C3%B1ol-c60b1e?style=for-the-badge" alt="Español"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/%E4%B8%AD%E6%96%87-de2910?style=for-the-badge" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-bc002d?style=for-the-badge" alt="日本語"></a>
  <a href="README.ru.md"><img src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-0039a6?style=for-the-badge" alt="Русский"></a>
</p>

LIVE automático de TikTok con **CJ (Carl Johnson)** caminando solo por GTA V:
responde el chat con IA y la voz de CJ en portugués de Brasil, mueve la boca, reacciona a los regalos con
acciones locas en el juego, y tiene misiones, metas de likes, rankings, moderación y capturas automáticas para que publiques.
Todo con herramientas **gratis**.

> Creado por **AjKaBaL**. Puedes usarlo y modificarlo libremente; solo mantén los créditos.

> **Idioma:** CJ habla **portugués de Brasil** en el live, y el menú y la configuración están en portugués.
> La personalidad de la IA (`persona/cj.md`) y la voz (`config.json` → `voice`) se pueden cambiar a otros idiomas.

---

## ⚠️ Antes de todo

- **Solo en modo historia.** Nunca entres a GTA Online con mods: te banean.
- **Reglas de TikTok:** activa la etiqueta **"Contenido generado por IA"** en el live y ten a alguien moderando
  de vez en cuando. Un live automático sin esto puede ser limitado.
- Los archivos de CJ (skin, voz, frases originales) **no vienen incluidos**: son de otros creadores / Rockstar.
  Abajo está dónde conseguir cada uno.

---

## Qué necesitas (todo gratis)

| Qué | Para qué | Dónde |
|---|---|---|
| GTA V **Legacy** (Epic o Steam) | el juego | tu cuenta |
| **Node.js** 22 o más nuevo | ejecuta CJ LIVE | nodejs.org |
| **ScriptHookV** | carga mods | dev-c.com/gtav/scripthookv |
| **ScriptHookVDotNet 3** (nightly) | ejecuta el mod de CJ | github.com/scripthookvdotnet/scripthookvdotnet-nightly |
| **OpenIV** | instala la skin de CJ | openiv.com |
| Skin **"CJ Full Replacement"** (xXcalvin54Xx) | convierte a Franklin en CJ | gta5-mods.com |
| **OBS Studio** | transmite el live | obsproject.com |
| Clave de **Gemini** | la IA que responde el chat | aistudio.google.com/apikey |
| *(opcional)* **Applio** + modelo RVC de CJ | el timbre de voz de CJ | github.com/IAHispano/Applio · huggingface.co/binant/CJ__RVC_V2_-_400_Epochs_ |

Sin Applio el live funciona igual, con una voz brasileña normal.

---

## Instalación (el asistente hace casi todo)

1. Descárgalo aquí en GitHub (botón verde **Code → Download ZIP**) y **extráelo** en un lugar fácil (ej.: `D:\CJ LIVE`).
2. Haz doble clic en **`Ligar-CJ-LIVE.cmd`**.
   - Si no tienes **Node.js**, ofrece instalarlo (pulsa S). Luego ábrelo de nuevo.
3. La primera vez se abre el **asistente de configuración**. Responde S (sí) o N (no) y él:
   - **encuentra GTA V** (Epic, Steam o carpeta) y revisa **ScriptHookV**, **ScriptHookVDotNet** y la **skin de CJ**
     (si falta algo, abre la página de descarga y espera a que copies los archivos);
   - instala el **mod de CJ LIVE** en GTA;
   - pone GTA en **ventana sin bordes** y sin pausa al perder el foco;
   - encuentra (o instala) **OBS** y crea el perfil y la escena **"CJ LIVE"** listos: 1080x1920, juego + overlay + sonido;
   - pide tu **usuario de TikTok** y la **clave de la IA** (abre la página de Google para conseguirla, es gratis);
   - encuentra la **voz de CJ** (Applio), si está instalada;
   - crea el acceso directo **"Ligar CJ LIVE"** en el escritorio.
4. En **OBS**, solo conecta tu cuenta: Ajustes → Emisión.

¿Quieres cambiar algo después? Menú → **[C]** abre el asistente de nuevo. Todo está también en `config.json`
(la sección `"pc"` = rutas de este equipo).

> **Lo que el asistente no hace por ti:** descargar ScriptHookV y la skin de CJ (sus autores no permiten
> redistribuirlos; abre la página y revisa después) e instalar Applio para el timbre de CJ (opcional).

### Voz de CJ (opcional)

Instala Applio y pon el modelo de CJ (`model.pth` y `model.index`) en `Applio\logs\cj\`.
Ejecuta el asistente de nuevo (opción C) y lo encuentra solo.

---

## Uso

Doble clic en **Ligar CJ LIVE**:

| Opción | Qué hace |
|---|---|
| 1 | **Live real** — abre GTA y OBS, se conecta a TikTok y se reconecta si se cae |
| 2 | **Prueba** — simulador sin TikTok (escribe `chat ana oi cj`, `gift ana Rose 1 1`...) |
| 3 | Ver todos los comandos |
| 4 | **Probar regalos** — eliges una acción y ocurre (con el live o la prueba abiertos en otra ventana) |
| 5 | Reiniciar misiones |
| 6 | Top donadores (todos los lives) |
| 7 | Moderación — quién está castigado, para banearlo en la app |
| 8 | Cambiar usuario de TikTok |
| 9 | Poner la clave de la IA |
| T | **Tutorial** — cómo iniciar y detener la transmisión en TikTok |
| C | Abrir el asistente de nuevo |
| 0 | Salir |

En el juego, modo historia, a pie: **F7** activa la cámara del live y **F8** el piloto automático. Listo: vive solo.

> Deja GTA **al frente** durante el live: GTA V silencia el juego cuando pierde el foco (Alt+Tab). Controla el resto desde el móvil.

| Tecla en GTA | Función |
|---|---|
| F7 | Cámara del live |
| F8 | Piloto automático |
| F9 | Probar la siguiente acción |
| F10 | Estado de la conexión |
| End / PageUp / PageDown / Delete | Probador de ropa (F5 guarda, F6 quita gorra/gafas) |
| Pause | Prueba de la boca |
| Insert | Recarga el mod |

---

## Qué incluye

- **IA con la personalidad de CJ** (`persona/cj.md`) respondiendo el chat con voz, subtítulos y la boca moviéndose.
- **Regalos** con acciones fijas (tarjetas) y aleatorias según el valor: policía de 4–5 estrellas con AK, Ballas, Grove Street,
  tanque, avión estrellándose, tornado, lluvia de coches/vacas/dinero, payasos, nieve, gravedad lunar, furia de Trevor...
- **Actitudes de jugador** por su cuenta: trompos, rampas, peleas, destrozar coches, disparos al aire.
- **Misiones** que suben de nivel, **meta de likes** oculta con sorpresas, **rankings** y animaciones en el overlay.
- **Pedidos del chat:** si 3 personas piden "vai na praia" (ve a la playa), él va (solo lugares seguros).
- **Frases originales de CJ** (carpeta `falas-originais`, tú pones los audios; abajo cómo sacarlos de tu San Andreas).
  No se repiten hasta sonar todas, y de vez en cuando suelta una frase cuando el live está tranquilo.
- **Moderación:** groserías/spam = falta; a la 3ª queda castigado. Los apodos con doble sentido se vuelven "Parceiro".
- **Capturas automáticas** en `Imágenes\CJ LIVE` (solo con GTA al frente).

Casi todo se ajusta en `config.json` (cada sección tiene un `_comentario` que lo explica).

### Sacar las frases de CJ de tu GTA San Andreas (opcional)

Necesitas GTA San Andreas **clásico** (Steam) instalado y Applio (usa su Python y Whisper, en la GPU).
Abre una terminal en la carpeta de CJ LIVE y ejecuta, uno por uno:

1. Extraer los ~4.000 audios de CJ: `node tools/sa-audio.js "C:/carpeta/de/San Andreas" SPC_PA falas-san-andreas/todas`
2. Transcribir (unos 60 min): `D:/Applio/env/Scripts/python.exe -I tools/sa-transcrever.py falas-san-andreas/todas falas-san-andreas/transcricoes.json`
   (si se detiene, ejecútalo de nuevo: continúa donde quedó)
3. Separar por momento (usa la clave de Gemini del `.env`; quita ofensas y repeticiones, y "atraganta" el f*ck en "fu—"):
   `node tools/sa-separar.js falas-san-andreas/transcricoes.json falas-san-andreas/todas`

Las frases van a `falas-originais/<momento>/`. Después puedes incluso desinstalar San Andreas.

---

## Créditos

- **CJ LIVE:** creado por **AjKaBaL** (idea, código, mod y overlay)
- Skin de CJ: xXcalvin54Xx / Legendario9991 (gta5-mods.com)
- Voz: Applio (IAHispano) + modelo RVC de CJ (binant, Hugging Face) · Microsoft Edge TTS
- tiktok-live-connector (zerodytrash) · ScriptHookV (Alexander Blade) · ScriptHookVDotNet
- GTA V y GTA San Andreas © Rockstar Games
