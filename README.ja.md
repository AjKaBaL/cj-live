# CJ LIVE — 作者 AjKaBaL

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Portugu%C3%AAs-009c3b?style=for-the-badge" alt="Português"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-0a3d91?style=for-the-badge" alt="English"></a>
  <a href="README.es.md"><img src="https://img.shields.io/badge/Espa%C3%B1ol-c60b1e?style=for-the-badge" alt="Español"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/%E4%B8%AD%E6%96%87-de2910?style=for-the-badge" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-bc002d?style=for-the-badge" alt="日本語"></a>
  <a href="README.ru.md"><img src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-0039a6?style=for-the-badge" alt="Русский"></a>
</p>

**CJ（Carl Johnson）** が GTA V の中をひとりで歩き回る、全自動の TikTok LIVE：
AI と CJ の声（ブラジル・ポルトガル語）でチャットに返事をして、口が動き、ギフトにはゲーム内のクレイジーな
アクションで反応します。ミッション、いいね目標、ランキング、自動モデレーション、投稿用の自動スクリーンショットもあります。
すべて**無料**のツールで動きます。

> 作者 **AjKaBaL**。自由に使って改造してOKです。クレジットだけは残してください。

> **言語について：** ライブ中の CJ は**ブラジル・ポルトガル語**で話し、ランチャーのメニューと設定もポルトガル語です。
> AI のキャラ設定（`persona/cj.md`）と音声（`config.json` → `voice`）は他の言語に変更できます。

---

## ⚠️ はじめに

- **ストーリーモード専用。** Mod を入れたまま GTA オンラインに入らないでください。BAN されます。
- **TikTok のルール：** ライブで **「AI生成コンテンツ」** ラベルをオンにして、ときどき誰かがモデレーションしてください。
  これがない全自動ライブは制限されることがあります。
- CJ のファイル（スキン、声、オリジナルのセリフ）は**含まれていません**。他の作者 / Rockstar のものです。
  入手先は下にあります。

---

## 必要なもの（すべて無料）

| 名前 | 用途 | 入手先 |
|---|---|---|
| GTA V **Legacy**（Epic または Steam） | ゲーム本体 | あなたのアカウント |
| **Node.js** 22 以降 | CJ LIVE を動かす | nodejs.org |
| **ScriptHookV** | Mod を読み込む | dev-c.com/gtav/scripthookv |
| **ScriptHookVDotNet 3**（nightly） | CJ の Mod を動かす | github.com/scripthookvdotnet/scripthookvdotnet-nightly |
| **OpenIV** | CJ のスキンを入れる | openiv.com |
| **「CJ Full Replacement」** スキン（xXcalvin54Xx） | Franklin を CJ にする | gta5-mods.com |
| **OBS Studio** | ライブ配信 | obsproject.com |
| **Gemini** の API キー | チャットに答える AI | aistudio.google.com/apikey |
| *（任意）* **Applio** + CJ の RVC モデル | CJ の声質 | github.com/IAHispano/Applio · huggingface.co/binant/CJ__RVC_V2_-_400_Epochs_ |

Applio がなくても、普通のブラジル人男性の声で同じように動きます。

---

## インストール（ウィザードがほぼ全部やります）

1. GitHub からダウンロード（緑の **Code → Download ZIP** ボタン）して、わかりやすい場所に**展開**します（例：`D:\CJ LIVE`）。
2. **`Ligar-CJ-LIVE.cmd`** をダブルクリック。
   - **Node.js** がない場合はインストールを提案します（S を押す）。そのあともう一度開いてください。
3. 初回は**セットアップウィザード**が開きます。S（はい）か N（いいえ）で答えると：
   - **GTA V を自動で探し**（Epic、Steam、フォルダ）、**ScriptHookV**、**ScriptHookVDotNet**、**CJ のスキン**を確認します
     （足りないものがあればダウンロードページを開き、ファイルをコピーするまで待ちます）；
   - **CJ LIVE の Mod** を GTA にインストール；
   - GTA を**ボーダーレスウィンドウ**にして、フォーカスが外れても一時停止しないように設定；
   - **OBS** を見つけて（またはインストールして）、**「CJ LIVE」** のプロファイルとシーンを作成：1080x1920、ゲーム + オーバーレイ + 音声；
   - **TikTok のユーザー名**と **AI キー**を聞きます（Google のページを開くので無料で取得できます）；
   - Applio が入っていれば **CJ の声**を見つけます；
   - デスクトップに **「Ligar CJ LIVE」** のショートカットを作成。
4. **OBS** では自分のアカウントを接続するだけ：設定 → 配信。

あとで変更したいときは、メニュー → **[C]** でウィザードをもう一度実行。設定はすべて `config.json` にもあります
（`"pc"` の部分 = このパソコンのパス）。

> **ウィザードができないこと：** ScriptHookV と CJ スキンのダウンロード（作者が再配布を許可していないため。ページを開いて後で確認します）、
> CJ の声質のための Applio のインストール（任意）。

### CJ の声（任意）

Applio をインストールして、CJ のモデル（`model.pth` と `model.index`）を `Applio\logs\cj\` に置きます。
ウィザードをもう一度実行（オプション C）すれば自動で見つけます。

---

## 使い方

**Ligar CJ LIVE** をダブルクリック：

| オプション | 内容 |
|---|---|
| 1 | **本番ライブ** — GTA と OBS を開き、TikTok に接続。切れても自動で再接続 |
| 2 | **テスト** — TikTok なしのシミュレーター（`chat ana oi cj`、`gift ana Rose 1 1` などと入力） |
| 3 | すべてのコマンドを表示 |
| 4 | **ギフトのテスト** — アクションを選ぶと実行（別ウィンドウでライブかテストを開いておく） |
| 5 | ミッションをリセット |
| 6 | ギフトランキング（全ライブ） |
| 7 | モデレーション — ミュートされた人の一覧（アプリで BAN できます） |
| 8 | TikTok ユーザー名を変更 |
| 9 | AI キーを設定 |
| T | **チュートリアル** — TikTok で配信を開始・終了する方法 |
| C | セットアップウィザードをもう一度実行 |
| 0 | 終了 |

ゲーム内（ストーリーモード、徒歩）で：**F7** でライブカメラ、**F8** でオートパイロット。これで完了、彼はひとりで生活します。

> ライブ中は GTA を**最前面**にしておいてください。GTA V はフォーカスが外れる（Alt+Tab）と音が消えます。ほかの操作はスマホから。

| GTA のキー | 機能 |
|---|---|
| F7 | ライブカメラ |
| F8 | オートパイロット |
| F9 | 次のアクションをテスト |
| F10 | 接続状態 |
| End / PageUp / PageDown / Delete | 着せ替え（F5 で保存、F6 で帽子/メガネを外す） |
| Pause | 口の動きのテスト |
| Insert | Mod を再読み込み |

---

## 機能

- **CJ の性格を持つ AI**（`persona/cj.md`）が声でチャットに返事。字幕付きで口も動きます。
- **ギフト**：固定のアクション（カード）と金額に応じたランダムなアクション：AK を持った星 4–5 の警察、Ballas、Grove Street、
  戦車、飛行機の墜落、竜巻、車/牛/お金の雨、ピエロ、雪、月の重力、Trevor の激怒……
- **人間のプレイヤーのような行動**をひとりで：ドーナツターン、ジャンプ台、ケンカ、車の破壊、空に向けて発砲。
- レベルアップする**ミッション**、隠れた**いいね目標**とサプライズ、**ランキング**、オーバーレイのアニメーション。
- **チャットからのリクエスト：** 3 人が「vai na praia」（ビーチに行って）と言えば行きます（安全な場所だけ）。
- **CJ のオリジナルのセリフ**（`falas-originais` フォルダ。音声は自分で入れます。San Andreas から取り出す方法は下に）。
  全部流れるまで繰り返さず、ライブが静かなときはときどき独り言を言います。
- **モデレーション：** 悪口/スパム = 警告 1 回、3 回目でミュート。下ネタのダジャレのニックネームは「Parceiro」に置き換え。
- **自動スクリーンショット**を `ピクチャ\CJ LIVE` に保存（GTA が最前面のときだけ）。

ほとんどの項目は `config.json` で調整できます（各セクションに説明の `_comentario` があります）。

### 自分の GTA San Andreas から CJ のセリフを取り出す（任意）

**クラシック版** GTA San Andreas（Steam）と Applio（その Python と Whisper を GPU で使います）が必要です。
CJ LIVE のフォルダでターミナルを開き、1 つずつ実行します：

1. 約 4,000 個の CJ の音声を取り出す：`node tools/sa-audio.js "C:/San Andreas/のフォルダ" SPC_PA falas-san-andreas/todas`
2. 文字起こし（約 60 分）：`D:/Applio/env/Scripts/python.exe -I tools/sa-transcrever.py falas-san-andreas/todas falas-san-andreas/transcricoes.json`
   （途中で止まったら、もう一度実行すれば続きから再開します）
3. 場面ごとに分類（`.env` の Gemini キーを使用。差別的な表現と重複を除き、f*ck を「fu—」で「詰まらせ」ます）：
   `node tools/sa-separar.js falas-san-andreas/transcricoes.json falas-san-andreas/todas`

セリフは `falas-originais/<場面>/` に入ります。そのあとは San Andreas をアンインストールしても大丈夫です。

---

## クレジット

- **CJ LIVE：** **AjKaBaL** 作（アイデア、コード、Mod、オーバーレイ）
- CJ スキン：xXcalvin54Xx / Legendario9991（gta5-mods.com）
- 声：Applio（IAHispano）+ CJ の RVC モデル（binant、Hugging Face）· Microsoft Edge TTS
- tiktok-live-connector（zerodytrash）· ScriptHookV（Alexander Blade）· ScriptHookVDotNet
- GTA V と GTA San Andreas © Rockstar Games
