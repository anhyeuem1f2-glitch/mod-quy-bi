@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
echo ===== QBCC v0.6.0 - BUILD/TEST KHONG PUSH, KHONG PYTHON =====
where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Thieu Node.js LTS: https://nodejs.org/
  goto :failed
)
where git >nul 2>nul
if errorlevel 1 (
  echo [LOI] Thieu Git.
  goto :failed
)
set "REPO=%~dp0"
if not exist "%REPO%\.git" (
  echo Nhap duong dan THU MUC repo mod-quy-bi co .git
  set /p "REPO=Thu muc mod-quy-bi: "
)
if not exist "%REPO%\.git" goto :failed
node "%~dp0FIX_BUILD_PUSH.mjs" --repo "%REPO%"
if errorlevel 1 goto :failed
echo.
echo [OK] Da tao file /dist/qbcc-runtime-v0.6.0.js. Chua push.
pause
exit /b 0
:failed
echo.
echo FAILED. KHONG push.
pause
exit /b 1
