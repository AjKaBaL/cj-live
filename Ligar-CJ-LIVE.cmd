@echo off
rem CJ LIVE — por AjKaBaL
rem Liga tudo da CJ LIVE com dois cliques: index.js (IA + voz + overlay), GTA V e OBS.
rem Na live de verdade, se o index.js cair ele volta sozinho em 5 segundos.
chcp 65001 >nul
title CJ LIVE - por AjKaBaL
cd /d "%~dp0"

rem Precisa do Node.js: se não tiver, oferece instalar pelo winget do Windows
where node >nul 2>nul || (
    echo.
    echo   O Node.js não está instalado ^(ele roda a CJ LIVE^).
    choice /c SN /n /m "  Instalar agora? (S/N) "
    if errorlevel 2 (start "" "https://nodejs.org" & exit /b)
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    echo.
    echo   Pronto! Feche esta janela e abra o Ligar CJ LIVE de novo.
    pause
    exit /b
)

rem Primeira vez (pacote recém-baixado): instala as dependências do Node
if not exist node_modules (
    echo   Instalando as dependências pela primeira vez...
    call npm install
)
if not exist .env if exist .env.example copy .env.example .env >nul

rem Primeira vez: assistente que acha o GTA, configura OBS, usuário, chave da IA e voz
if not exist data\configurado.txt (
    node tools\configurar.js
    pause
)

:menu
cls
set USUARIO=
if exist usuario-tiktok.txt set /p USUARIO=<usuario-tiktok.txt
echo.
echo  ===============  CJ LIVE  ===============
echo                  por AjKaBaL
if defined USUARIO (echo   Usuário do TikTok: @%USUARIO%) else (echo   Usuário do TikTok: ainda não configurado)
echo.
echo   [1] Live de verdade (TikTok)
echo   [2] Teste (simulador, sem TikTok)
echo   [3] Ver todos os comandos
echo   [4] Testar presentes (com a live ou o teste aberto em outra janela)
echo   [5] Resetar as missões
echo   [6] Top doadores
echo   [7] Moderação (quem está de castigo)
echo   [8] Trocar o usuário do TikTok
echo   [9] Colocar a chave da IA (Gemini)
echo   [T] Tutorial: como transmitir e parar a live no TikTok
echo   [C] Configurar tudo de novo (GTA, OBS, usuário, chave, voz)
echo   [0] Sair
echo.
choice /c 1234567890CT /n /m "  Escolha um número: "
set MODO=%errorlevel%
if "%MODO%"=="12" goto :tutorial
if "%MODO%"=="11" goto :configurar
if "%MODO%"=="10" exit /b
if "%MODO%"=="9" goto :chave
if "%MODO%"=="3" goto :comandos
if "%MODO%"=="4" goto :testar
if "%MODO%"=="5" goto :resetar
if "%MODO%"=="6" goto :doadores
if "%MODO%"=="7" goto :moderacao
if "%MODO%"=="8" goto :usuario
if "%MODO%"=="1" if not defined USUARIO goto :usuario
goto :abrir

:comandos
cls
node tools\comandos.js
pause
goto :menu

:testar
cls
node tools\testar.js
pause
goto :menu

:resetar
echo.
choice /c SN /n /m "  Zerar as missões e voltar ao nível 1? (S/N) "
if errorlevel 2 goto :menu
node tools\resetar.js
pause
goto :menu

:doadores
cls
node tools\doadores.js
pause
goto :menu

:moderacao
cls
node tools\moderacao.js
choice /c SN /n /m "  Zerar a lista? Faça com a live desligada. (S/N) "
if errorlevel 2 goto :menu
node tools\moderacao.js --limpar
pause
goto :menu

:tutorial
cls
node tools	utorial.js
pause
goto :menu

:configurar
cls
node tools\configurar.js
pause
goto :menu

:usuario
echo.
set USUARIO=
set /p USUARIO="  Seu usuário do TikTok (sem @): "
if not defined USUARIO goto :menu
set USUARIO=%USUARIO:@=%
>usuario-tiktok.txt echo %USUARIO%
echo   Salvo!
timeout /t 1 >nul
goto :menu

:chave
echo.
echo   Vai abrir o Bloco de Notas. Cole a chave depois de GEMINI_API_KEY=
echo   (pegue grátis em https://aistudio.google.com/apikey), salve com Ctrl+S e feche.
pause
notepad .env
goto :menu

:abrir
rem Instala/atualiza o mod e abre o GTA V e o OBS (caminhos em config.json -> pc)
node tools\abrir.js

echo.
echo   No GTA: F7 liga a câmera da live, F8 liga o piloto automático.
echo.
if "%MODO%"=="2" (
    node index.js --sim
    pause
    goto :menu
)

:live
node index.js %USUARIO%
echo.
echo   O index.js parou. Reiniciando em 5 segundos (feche esta janela para parar)...
timeout /t 5 >nul
goto :live
