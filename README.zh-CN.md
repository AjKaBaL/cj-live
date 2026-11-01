# CJ LIVE — 作者 AjKaBaL

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Portugu%C3%AAs-009c3b?style=for-the-badge" alt="Português"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-0a3d91?style=for-the-badge" alt="English"></a>
  <a href="README.es.md"><img src="https://img.shields.io/badge/Espa%C3%B1ol-c60b1e?style=for-the-badge" alt="Español"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/%E4%B8%AD%E6%96%87-de2910?style=for-the-badge" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-bc002d?style=for-the-badge" alt="日本語"></a>
  <a href="README.ru.md"><img src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-0039a6?style=for-the-badge" alt="Русский"></a>
</p>

全自动 TikTok 直播：**CJ（Carl Johnson）** 在 GTA V 里自己到处走：
他用 AI 和 CJ 的声音（巴西葡萄牙语）回复弹幕，嘴会动，收到礼物会在游戏里做出疯狂的动作，
还有任务、点赞目标、排行榜、自动管理和自动截图，方便你发视频。
全部使用**免费**工具。

> 由 **AjKaBaL** 制作。可以随意使用和修改，只需保留署名。

> **语言说明：** CJ 在直播中说**巴西葡萄牙语**，启动菜单和设置也是葡萄牙语。
> AI 人设（`persona/cj.md`）和语音（`config.json` → `voice`）可以改成其他语言。

---

## ⚠️ 开始之前

- **仅限故事模式。** 千万不要带着 Mod 进入 GTA 线上模式，会被封号。
- **TikTok 规则：** 在直播中打开 **“AI 生成内容”** 标签，并时不时有人在旁边管理。
  没有这些的全自动直播可能会被限流。
- CJ 的文件（皮肤、声音、原版台词）**不包含在内**：它们属于其他作者 / Rockstar。
  下面写了每个文件的下载地址。

---

## 需要准备（全部免费）

| 名称 | 用途 | 下载 |
|---|---|---|
| GTA V **Legacy**（Epic 或 Steam） | 游戏本体 | 你的账号 |
| **Node.js** 22 或更新 | 运行 CJ LIVE | nodejs.org |
| **ScriptHookV** | 加载 Mod | dev-c.com/gtav/scripthookv |
| **ScriptHookVDotNet 3**（nightly） | 运行 CJ Mod | github.com/scripthookvdotnet/scripthookvdotnet-nightly |
| **OpenIV** | 安装 CJ 皮肤 | openiv.com |
| **“CJ Full Replacement”** 皮肤（xXcalvin54Xx） | 把 Franklin 变成 CJ | gta5-mods.com |
| **OBS Studio** | 推流直播 | obsproject.com |
| **Gemini** API 密钥 | 回复弹幕的 AI | aistudio.google.com/apikey |
| *（可选）* **Applio** + CJ 的 RVC 模型 | CJ 的音色 | github.com/IAHispano/Applio · huggingface.co/binant/CJ__RVC_V2_-_400_Epochs_ |

没有 Applio 也能正常直播，只是用普通的巴西男声。

---

## 安装（向导几乎全部帮你完成）

1. 在 GitHub 下载（绿色按钮 **Code → Download ZIP**），**解压**到方便的位置（例如 `D:\CJ LIVE`）。
2. 双击 **`Ligar-CJ-LIVE.cmd`**。
   - 如果没有 **Node.js**，它会提示自动安装（按 S），装好后再打开一次。
3. 第一次运行会打开**设置向导**。回答 S（是）或 N（否），它会：
   - 自动**找到 GTA V**（Epic、Steam 或文件夹），检查 **ScriptHookV**、**ScriptHookVDotNet** 和 **CJ 皮肤**
     （缺少的话会打开下载页面，等你复制好文件）；
   - 把 **CJ LIVE Mod** 安装到 GTA；
   - 把 GTA 设为**无边框窗口**，并且切出窗口时不暂停；
   - 找到（或安装）**OBS**，创建好 **“CJ LIVE”** 配置和场景：1080x1920，游戏 + 叠加层 + 声音；
   - 询问你的 **TikTok 用户名**和 **AI 密钥**（会打开 Google 页面，免费获取）；
   - 如果装了 Applio，会找到 **CJ 的声音**；
   - 在桌面创建 **“Ligar CJ LIVE”** 快捷方式。
4. 在 **OBS** 里只需连接你的账号：设置 → 直播。

以后想改设置？菜单 → **[C]** 重新运行向导。所有设置也都在 `config.json` 里
（`"pc"` 部分 = 这台电脑上的路径）。

> **向导不能替你做的事：** 下载 ScriptHookV 和 CJ 皮肤（作者不允许转发，向导会打开页面并在之后检查），
> 以及安装 Applio 来获得 CJ 的音色（可选）。

### CJ 的声音（可选）

安装 Applio，把 CJ 模型（`model.pth` 和 `model.index`）放到 `Applio\logs\cj\`。
再运行一次向导（选项 C），它会自动找到。

---

## 使用方法

双击 **Ligar CJ LIVE**：

| 选项 | 功能 |
|---|---|
| 1 | **正式直播** — 打开 GTA 和 OBS，连接 TikTok，断线自动重连 |
| 2 | **测试** — 不连 TikTok 的模拟器（输入 `chat ana oi cj`、`gift ana Rose 1 1`……） |
| 3 | 查看所有命令 |
| 4 | **测试礼物** — 选一个动作让它发生（需要另一个窗口开着直播或测试） |
| 5 | 重置任务 |
| 6 | 礼物榜（所有直播） |
| 7 | 管理 — 被禁言的人，方便你在 App 里封禁 |
| 8 | 更换 TikTok 用户名 |
| 9 | 设置 AI 密钥 |
| T | **教程** — 如何在 TikTok 开始和结束直播 |
| C | 重新运行设置向导 |
| 0 | 退出 |

游戏中（故事模式，步行状态）：**F7** 打开直播镜头，**F8** 打开自动驾驶。完成：他会自己生活。

> 直播时请让 GTA **保持在最前面**：GTA V 失去焦点（Alt+Tab）时会静音。其余操作用手机控制。

| GTA 按键 | 功能 |
|---|---|
| F7 | 直播镜头 |
| F8 | 自动驾驶 |
| F9 | 测试下一个动作 |
| F10 | 连接状态 |
| End / PageUp / PageDown / Delete | 换装（F5 保存，F6 摘帽子/眼镜） |
| Pause | 嘴型测试 |
| Insert | 重新加载 Mod |

---

## 功能

- **拥有 CJ 性格的 AI**（`persona/cj.md`）用语音回复弹幕，带字幕，嘴会动。
- **礼物**：固定动作（卡片）和按价值随机的动作：4–5 星警察 + AK、Ballas、Grove Street、
  坦克、飞机坠毁、龙卷风、天降汽车/奶牛/钞票、小丑、下雪、月球重力、Trevor 暴怒……
- **像真人玩家一样** 自己行动：原地漂移、飞跃坡道、街头斗殴、砸车、朝天开枪。
- 会升级的**任务**、隐藏的**点赞目标**和惊喜、**排行榜**以及叠加层动画。
- **弹幕点地点：** 如果 3 个人说 “vai na praia”（去海滩），他就会去（只限安全地点）。
- **CJ 原版台词**（`falas-originais` 文件夹，音频需自己放入；下面有从你的 San Andreas 提取的方法）。
  全部播完之前不会重复，直播安静时他也会随口说一句。
- **自动管理：** 脏话/刷屏 = 记一次，第 3 次禁言。带双关含义的恶搞昵称会变成 “Parceiro”。
- **自动截图** 保存在 `图片\CJ LIVE`（仅当 GTA 在最前面时）。

几乎所有内容都能在 `config.json` 中调整（每个部分都有 `_comentario` 说明）。

### 从你的 GTA San Andreas 提取 CJ 台词（可选）

需要安装**经典版** GTA San Andreas（Steam）和 Applio（使用它的 Python 和 Whisper，在 GPU 上运行）。
在 CJ LIVE 文件夹打开终端，依次运行：

1. 提取约 4000 条 CJ 音频：`node tools/sa-audio.js "C:/San Andreas/路径" SPC_PA falas-san-andreas/todas`
2. 转写（约 60 分钟）：`D:/Applio/env/Scripts/python.exe -I tools/sa-transcrever.py falas-san-andreas/todas falas-san-andreas/transcricoes.json`
   （中途停止的话再运行一次，会从断点继续）
3. 按场景分类（使用 `.env` 里的 Gemini 密钥；去掉冒犯内容和重复，并把 f*ck 在 “fu—” 处“卡住”）：
   `node tools/sa-separar.js falas-san-andreas/transcricoes.json falas-san-andreas/todas`

台词会放到 `falas-originais/<场景>/`。之后甚至可以卸载 San Andreas。

---

## 致谢

- **CJ LIVE：** 由 **AjKaBaL** 制作（创意、代码、Mod 和叠加层）
- CJ 皮肤：xXcalvin54Xx / Legendario9991（gta5-mods.com）
- 声音：Applio（IAHispano）+ CJ RVC 模型（binant，Hugging Face）· Microsoft Edge TTS
- tiktok-live-connector（zerodytrash）· ScriptHookV（Alexander Blade）· ScriptHookVDotNet
- GTA V 和 GTA San Andreas © Rockstar Games
