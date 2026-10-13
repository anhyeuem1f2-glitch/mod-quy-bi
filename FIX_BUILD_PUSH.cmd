@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
echo ===== QBCC v0.6.0 - BUILD + PUSH KHONG CAN PYTHON =====
where git >nul 2>nul
if errorlevel 1 (
  echo [LOI] Khong thay Git. Git PUSH_TO_GITHUB.cmd cu phai chay duoc.
  goto :failed
)
where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Khong thay Node.js. Can Node.js de build va kiem tra JavaScript, KHONG can Python.
  echo Co the cai Node.js LTS tai https://nodejs.org/ va mo lai file CMD.
  goto :failed
)
set "REPO=%~dp0"
if not exist "%REPO%\.git" (
  echo File nay dang o ngoai thu muc Git. Hay nhap duong dan THU MUC goc mod-quy-bi co .git
  set /p "REPO=Thu muc mod-quy-bi: "
)
if not exist "%REPO%\.git" (
  echo [LOI] Duong dan khong phai Git repo. Khong build/push gi ca.
  goto :failed
)
node "%~dp0FIX_BUILD_PUSH.mjs" --repo "%REPO%" --push
if errorlevel 1 goto :failed
echo.
echo [OK] Da BUILD, TEST va PUSH. Kiem tra GitHub /dist/qbcc-runtime-v0.6.0.js
pause
exit /b 0
:failed
echo.
echo FAILED - Dung an toan. KHONG force-push.
pause
exit /b 1
