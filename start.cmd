@echo off
REM Start Sahi Company dev server on port 3001

cd /d "%~dp0"

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo npm not found. Please install Node.js and npm first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
)

REM Stop any existing dev server on port 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
  echo Stopping existing server on port 3001...
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Starting dev server at http://localhost:3001
call npm run dev
pause
