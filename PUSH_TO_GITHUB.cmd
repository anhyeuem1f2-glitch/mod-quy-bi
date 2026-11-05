@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title QBCC Runtime v0.6.1 - Push prebuilt
echo QBCC v0.6.1: Push runtime da build san (khong can Python/Node)
where git >nul 2>nul || goto :failed
if not exist ".git" (echo THIEU .git TRONG THU MUC REPO & goto :failed)
if not exist "dist\qbcc-runtime-v0.6.1.js" (echo THIEU dist\qbcc-runtime-v0.6.1.js & goto :failed)
for %%F in ("dist\qbcc-runtime-v0.6.1.js") do if %%~zF LSS 100000 (echo FILE BUILD KHONG HOP LE & goto :failed)
findstr /C:"bundle v0.6.1" "dist\qbcc-runtime-v0.6.1.js" >nul || goto :failed
findstr /C:"buildNpcAgencyAuthority" "dist\qbcc-runtime-v0.6.1.js" >nul || goto :failed
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "REMOTE=%%R"
if not defined REMOTE goto :failed
echo %REMOTE% | findstr /i /c:"anhyeuem1f2-glitch/mod-quy-bi" >nul || goto :failed
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if /I not "%BRANCH%"=="main" goto :failed
git diff --cached --quiet || (echo Co file da STAGE, dung an toan & goto :failed)
if exist "dist\qbcc-runtime-v0.5.1.js" (
  echo [CLEANUP] Xoa runtime v0.5.1 theo yeu cau.
  del /q "dist\qbcc-runtime-v0.5.1.js" || goto :failed
)
git add -A -- src dist tests README.md package.json build_bundle.mjs PUSH_TO_GITHUB.cmd examples docs
git diff --cached --check || goto :failed
git diff --cached --quiet && goto :push
git commit -m "QBCC v0.6.1 - hard mode NPC security and prebuilt runtime" || goto :failed
:push
git push origin HEAD:main || goto :failed
echo [OK] PUSH THANH CONG, verify dist/qbcc-runtime-v0.6.1.js on GitHub.
pause
exit /b 0
:failed
echo [FAILED] Khong force-push. Kiem tra loi tren.
pause
exit /b 1
