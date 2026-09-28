@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "KEEP=qbcc-runtime-v0.4.3.js"
echo [QBCC] Cleaning stale runtime bundles...
for %%F in (dist\qbcc-runtime-v*.js) do (
  if /I not "%%~nxF"=="%KEEP%" (
    echo   deleting %%F
    del /Q "%%F" 2>nul
  )
)

git add -A
git commit -m "QBCC Runtime v0.4.3 - clean upgrade and stale runtime disposal"
git push origin main
pause
