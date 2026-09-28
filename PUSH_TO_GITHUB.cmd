@echo off
setlocal
cd /d "%~dp0"
git add .
git commit -m "QBCC Runtime Companion v0.4.2 - Tavern Helper iframe bridge"
git push origin main
pause
