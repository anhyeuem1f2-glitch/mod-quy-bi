@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title QBCC Runtime v0.6.0 - GitHub Push

echo ======================================================
echo   QBCC v0.6.0 - PUSH FILE DA BUILD SAN
 echo   Chi can Git. Khong can Python hoac Node.js.
echo ======================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [LOI] Khong tim thay Git.
  goto :failed
)
if not exist ".git" (
  echo [LOI] Khong thay .git ngay canh PUSH_TO_GITHUB.cmd
  echo Giai nen ZIP vao dung thu muc repo QBCC_Runtime_Companion CU,
  echo chon GHI DE cac file. Khong giai nen vao thu muc con khac.
  goto :failed
)
if not exist "src\index.js" (
  echo [LOI] Thieu src\index.js.
  goto :failed
)
if not exist "dist\qbcc-runtime-v0.6.0.js" (
  echo [LOI] Thieu runtime da build san v0.6.0.
  goto :failed
)
for %%F in ("dist\qbcc-runtime-v0.6.0.js") do (
  if %%~zF LSS 100000 (
    echo [LOI] File runtime nho bat thuong, dung an toan.
    goto :failed
  )
)
findstr /C:"bundle v0.6.0" "dist\qbcc-runtime-v0.6.0.js" >nul
if errorlevel 1 (
  echo [LOI] Sai version trong runtime.
  goto :failed
)
findstr /C:"buildNpcAgencyAuthority" "dist\qbcc-runtime-v0.6.0.js" >nul
if errorlevel 1 (
  echo [LOI] Runtime thieu module NPC agency.
  goto :failed
)
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "REMOTE=%%R"
if not defined REMOTE (
  echo [LOI] Git origin chua cau hinh.
  goto :failed
)
echo %REMOTE% | findstr /i /c:"anhyeuem1f2-glitch/mod-quy-bi" >nul
if errorlevel 1 (
  echo [LOI] Git origin khong phai mod-quy-bi.
  goto :failed
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if /I not "%BRANCH%"=="main" (
  echo [LOI] Hay chuyen sang nhanh main.
  goto :failed
)
git diff --cached --quiet
if errorlevel 1 (
  echo [LOI] Co file khac dang staged; hay xu ly truoc.
  goto :failed
)

echo [1/2] Xoa script cu da hong; giu mot nut PUSH_TO_GITHUB.cmd...
for %%F in (BUILD_AND_PUSH_GITHUB.cmd VERIFY_AND_BUILD_ONLY.cmd FIX_BUILD_ONLY.cmd FIX_BUILD_PUSH.cmd) do (
  if exist "%%F" del /q "%%F"
)

git add -A -- src dist tests examples README.md package.json build_bundle.mjs build_bundle.py PUSH_TO_GITHUB.cmd
git add -u -- BUILD_AND_PUSH_GITHUB.cmd VERIFY_AND_BUILD_ONLY.cmd FIX_BUILD_ONLY.cmd FIX_BUILD_PUSH.cmd 2>nul

git diff --cached --check
if errorlevel 1 goto :failed

echo [2/2] Commit va push len origin/main...
git diff --cached --quiet
if not errorlevel 1 goto :do_push
git commit -m "QBCC Runtime v0.6.0 - NPC agency, compiled distribution"
if errorlevel 1 goto :failed
:do_push
git push origin HEAD:main
if errorlevel 1 goto :failed

echo.
echo [OK] Push thanh cong. GitHub dist/ phai co qbcc-runtime-v0.6.0.js.
echo [INFO] Script KHONG stage file card JSON.
pause
exit /b 0
:failed
echo.
echo [FAILED] Khong force push, hay xem loi phia tren.
pause
exit /b 1
