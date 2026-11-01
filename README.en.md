# CJ LIVE — by AjKaBaL

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Portugu%C3%AAs-009c3b?style=for-the-badge" alt="Português"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-0a3d91?style=for-the-badge" alt="English"></a>
  <a href="README.es.md"><img src="https://img.shields.io/badge/Espa%C3%B1ol-c60b1e?style=for-the-badge" alt="Español"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/%E4%B8%AD%E6%96%87-de2910?style=for-the-badge" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-bc002d?style=for-the-badge" alt="日本語"></a>
  <a href="README.ru.md"><img src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-0039a6?style=for-the-badge" alt="Русский"></a>
</p>

Automated TikTok LIVE with **CJ (Carl Johnson)** walking around GTA V on his own:
he answers the chat with AI and CJ's voice in Brazilian Portuguese, moves his mouth, reacts to gifts with
crazy in-game actions, and has missions, like goals, rankings, moderation and auto screenshots for you to post.
Everything uses **free** tools.

> Created by **AjKaBaL**. Feel free to use and modify it; just keep the credits.

> **Language note:** CJ speaks **Brazilian Portuguese** on the live, and the launcher menu and settings are in Portuguese.
> The AI personality (`persona/cj.md`) and the voice (`config.json` → `voice`) can be changed to other languages.

---

## ⚠️ Before anything

- **Story mode only.** Never go into GTA Online with mods: you will get banned.
- **TikTok rules:** turn on the **"AI-generated content"** label on the live and have someone moderating
  from time to time. Fully automated lives without this may be limited.
- CJ's files (skin, voice, original lines) **are not included**: they belong to other creators / Rockstar.
  Below is where to get each one.

---

## What you need (all free)

| What | For | Where |
|---|---|---|
| GTA V **Legacy** (Epic or Steam) | the game | your account |
| **Node.js** 22 or newer | runs CJ LIVE | nodejs.org |
| **ScriptHookV** | loads mods | dev-c.com/gtav/scripthookv |
| **ScriptHookVDotNet 3** (nightly) | runs the CJ mod | github.com/scripthookvdotnet/scripthookvdotnet-nightly |
| **OpenIV** | installs the CJ skin | openiv.com |
| **"CJ Full Replacement"** skin (xXcalvin54Xx) | turns Franklin into CJ | gta5-mods.com |
| **OBS Studio** | streams the live | obsproject.com |
| **Gemini** API key | the AI that answers the chat | aistudio.google.com/apikey |
| *(optional)* **Applio** + CJ RVC model | CJ's voice timbre | github.com/IAHispano/Applio · huggingface.co/binant/CJ__RVC_V2_-_400_Epochs_ |

Without Applio the live works the same, with a regular Brazilian voice.

---

## Installation (the wizard does almost everything)

1. Download it here on GitHub (green **Code → Download ZIP** button) and **extract** it somewhere easy (e.g. `D:\CJ LIVE`).
2. Double-click **`Ligar-CJ-LIVE.cmd`**.
   - If you don't have **Node.js**, it offers to install it (press S). Then open it again.
3. The first time, the **setup wizard** opens. Answer S (yes) or N (no) and it:
   - **finds GTA V** (Epic, Steam or folder) and checks **ScriptHookV**, **ScriptHookVDotNet** and the **CJ skin**
     (if something is missing, it opens the download page and waits for you to copy the files);
   - installs the **CJ LIVE mod** into GTA;
   - sets GTA to **borderless window** and to not pause when it loses focus;
   - finds (or installs) **OBS** and creates a ready **"CJ LIVE"** profile and scene: 1080x1920, game + overlay + sound;
   - asks for your **TikTok username** and the **AI key** (opens Google's page so you can get it, it's free);
   - finds **CJ's voice** (Applio), if installed;
   - creates a **"Ligar CJ LIVE"** shortcut on the desktop.
4. In **OBS**, just connect your account: Settings → Stream.

Want to change something later? Menu → **[C]** runs the wizard again. Everything is also in `config.json`
(the `"pc"` section = paths on this computer).

> **What the wizard can't do for you:** download ScriptHookV and the CJ skin (their authors don't allow
> redistribution; it opens the page and checks afterwards) and install Applio for CJ's timbre (optional).

### CJ's voice (optional)

Install Applio and put the CJ model (`model.pth` and `model.index`) in `Applio\logs\cj\`.
Run the wizard again (option C) and it finds it.

---

## Usage

Double-click **Ligar CJ LIVE**:

| Option | What it does |
|---|---|
| 1 | **Real live** — opens GTA and OBS, connects to TikTok and reconnects if it drops |
| 2 | **Test** — simulator without TikTok (type `chat ana oi cj`, `gift ana Rose 1 1`...) |
| 3 | List all commands |
| 4 | **Test gifts** — pick an action and it happens (with the live or test running in another window) |
| 5 | Reset missions |
| 6 | Top donors (all lives) |
| 7 | Moderation — who is muted, so you can ban them in the app |
| 8 | Change TikTok username |
| 9 | Set the AI key |
| T | **Tutorial** — how to start and stop streaming on TikTok |
| C | Run the setup wizard again |
| 0 | Exit |

In game, story mode, on foot: **F7** turns on the live camera and **F8** the autopilot. That's it: he lives on his own.

> Keep GTA **in front** during the live: GTA V mutes the game when it loses focus (Alt+Tab). Control the rest from your phone.

| GTA key | Function |
|---|---|
| F7 | Live camera |
| F8 | Autopilot |
| F9 | Test the next action |
| F10 | Connection status |
| End / PageUp / PageDown / Delete | Outfit picker (F5 saves, F6 removes hat/glasses) |
| Pause | Mouth test |
| Insert | Reload the mod |

---

## Features

- **AI with CJ's personality** (`persona/cj.md`) answering the chat by voice, with subtitles and mouth movement.
- **Gifts** with fixed actions (cards) and random ones by value: 4–5 star police with AK, Ballas, Grove Street,
  tank, plane crash, tornado, raining cars/cows/money, clowns, snow, Moon gravity, Trevor rage...
- **Player-like behavior** on his own: donuts, ramps, street fights, wrecking cars, shooting in the air.
- **Missions** that level up, a hidden **like goal** with surprises, **rankings** and overlay animations.
- **Chat requests:** if 3 people ask "vai na praia" (go to the beach), he goes (safe places only).
- **Original CJ lines** (`falas-originais` folder, you add the audio; see below how to extract them from your San Andreas).
  They don't repeat until all have played, and now and then he says a random line when the live is quiet.
- **Moderation:** swearing/spam = strike; on the 3rd the user is muted. Double-meaning prank nicknames become "Parceiro".
- **Auto screenshots** in `Pictures\CJ LIVE` (only with GTA in front).

Almost everything can be tweaked in `config.json` (each section has a `_comentario` explaining it).

### Extract CJ's lines from your GTA San Andreas (optional)

Requires **classic** GTA San Andreas (Steam) installed and Applio (uses its Python and Whisper, on the GPU).
Open a terminal in the CJ LIVE folder and run, one at a time:

1. Extract the ~4,000 CJ audio clips: `node tools/sa-audio.js "C:/path/to/San Andreas" SPC_PA falas-san-andreas/todas`
2. Transcribe (about 60 min): `D:/Applio/env/Scripts/python.exe -I tools/sa-transcrever.py falas-san-andreas/todas falas-san-andreas/transcricoes.json`
   (if it stops, run it again: it resumes where it left off)
3. Sort by moment (uses the Gemini key from `.env`; removes slurs and repeats, and "chokes" the f-word at "fu—"):
   `node tools/sa-separar.js falas-san-andreas/transcricoes.json falas-san-andreas/todas`

The lines go to `falas-originais/<moment>/`. After that you can even uninstall San Andreas.

---

## Credits

- **CJ LIVE:** created by **AjKaBaL** (idea, code, mod and overlay)
- CJ skin: xXcalvin54Xx / Legendario9991 (gta5-mods.com)
- Voice: Applio (IAHispano) + CJ RVC model (binant, Hugging Face) · Microsoft Edge TTS
- tiktok-live-connector (zerodytrash) · ScriptHookV (Alexander Blade) · ScriptHookVDotNet
- GTA V and GTA San Andreas © Rockstar Games
