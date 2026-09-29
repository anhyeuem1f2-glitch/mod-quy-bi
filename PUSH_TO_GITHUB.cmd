@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "KEEP=qbcc-runtime-v0.5.1.js"
echo [QBCC] Cleaning ALL stale versioned runtime bundles...
for %%F in (dist\qbcc-runtime-v*.js) do (
  if /I not "%%~nxF"=="%KEEP%" (
    echo   deleting %%F
    del /Q "%%F" 2>nul
  )
)

git add -A
git commit -m "QBCC Runtime v0.5.1 - card scoped Kaiz Amon cleanup"
git push origin main
pause
