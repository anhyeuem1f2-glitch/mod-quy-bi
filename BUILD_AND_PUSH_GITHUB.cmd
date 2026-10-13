@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
where git >nul 2>nul || (echo ERROR: Install Git first. & pause & exit /b 1)
where node >nul 2>nul || (echo ERROR: Install Node.js first. & pause & exit /b 1)
where python >nul 2>nul || (echo ERROR: Install Python 3 first. & pause & exit /b 1)
if "%~1"=="" (
  python "%~dp0verified_build_push.py" --push
) else (
  python "%~dp0verified_build_push.py" --push --local-repo "%~1"
)
if errorlevel 1 (
  echo.
  echo FAILED: No force push. Read the error above.
  pause
  exit /b 1
)
echo.
echo SUCCESS. If pushed: reload your card after GitHub CDN propagation.
pause
exit /b 0
