@echo off
rem Double-click to start the trivia game on Windows.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js isn't installed yet.
  echo   Get it from https://nodejs.org ^(the big LTS button^), install it, then double-click this file again.
  echo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo   First time setup, one moment...
  call npm install --no-audit --no-fund
)
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000/host"
node server.js
pause
