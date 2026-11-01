// CJ LIVE — por AjKaBaL
// Tira um print só da imagem do jogo (a janela do GTA, e só quando ele está na frente) e salva em Imagens\CJ LIVE, para virar conteúdo do TikTok.
// Usa o PowerShell do próprio Windows: nada para instalar.

const { spawn } = require('child_process');

const SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type 'using System; using System.Runtime.InteropServices; public class W {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  public struct RECT { public int Left, Top, Right, Bottom; }
  public struct POINT { public int X, Y; } }'
# Só fotografa com o GTA na frente: nunca tira print de outra coisa que esteja na tela
[W]::SetProcessDPIAware() | Out-Null
$win = [W]::GetForegroundWindow()
$procId = 0; [W]::GetWindowThreadProcessId($win, [ref]$procId) | Out-Null
if ((Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName -ne 'GTA5') { exit }
# Só a imagem do jogo: a área de dentro da janela do GTA (sem barra de título, sem o resto da tela)
$r = New-Object W+RECT; [W]::GetClientRect($win, [ref]$r) | Out-Null
$p = New-Object W+POINT; [W]::ClientToScreen($win, [ref]$p) | Out-Null
$w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
if ($w -lt 100 -or $h -lt 100) { exit }
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($p.X, $p.Y, 0, 0, (New-Object System.Drawing.Size $w, $h))
$dir = Join-Path ([Environment]::GetFolderPath('MyPictures')) $env:CJ_SHOT_FOLDER
New-Item -ItemType Directory -Force $dir | Out-Null
$bmp.Save((Join-Path $dir $env:CJ_SHOT_NAME), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose(); $bmp.Dispose()
`;
const ENCODED = Buffer.from(SCRIPT, 'utf16le').toString('base64');

function createScreenshots(cfg = {}) {
    if (!cfg.enabled || process.platform !== 'win32') return { snap: () => {} };
    let lastAt = 0;

    // reason vira parte do nome do arquivo (ex.: 2026-10-28_17-30-05_policia.jpg)
    function snap(reason = 'aleatorio', delaySec = cfg.delaySec ?? 3) {
        const now = Date.now();
        if (now - lastAt < (cfg.minGapSec ?? 40) * 1000) return;
        lastAt = now;
        setTimeout(() => {
            const stamp = new Date().toLocaleString('sv-SE').replace(' ', '_').replace(/:/g, '-');
            const name = `${stamp}_${String(reason).replace(/[^\w-]/g, '')}.jpg`;
            const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', ENCODED], {
                env: { ...process.env, CJ_SHOT_FOLDER: cfg.folder || 'CJ LIVE', CJ_SHOT_NAME: name },
                stdio: 'ignore',
                windowsHide: true,
            });
            ps.on('error', () => {});
        }, delaySec * 1000);
    }

    // Além dos momentos de ação, uma foto de vez em quando
    const [min, max] = cfg.randomEveryMin || [4, 9];
    (function scheduleRandom() {
        setTimeout(() => { snap('aleatorio', 0); scheduleRandom(); }, (min + Math.random() * (max - min)) * 60000).unref();
    })();

    return { snap };
}

module.exports = { createScreenshots };
