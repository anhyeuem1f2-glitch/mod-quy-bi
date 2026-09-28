@echo off
setlocal
cd /d "%~dp0"
git init
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/anhyeuem1f2-glitch/mod-quy-bi.git
git add .
git commit -m "QBCC Runtime Companion v0.3.0"
git push -u origin main
pause
