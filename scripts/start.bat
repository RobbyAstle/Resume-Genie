@echo off
title Resume Genie
echo Starting Resume Genie...
echo.

set "PUPPETEER_EXECUTABLE_PATH=%~dp0chrome\chrome.exe"
set "NODE_ENV=production"
set "PORT=3000"
set "HOSTNAME=localhost"

:: Open browser after a short delay (in background)
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start the server (blocks until closed)
"%~dp0node\node.exe" "%~dp0node_modules\next\dist\bin\next" start --port %PORT% --hostname %HOSTNAME%

pause
