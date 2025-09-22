@echo off
echo ========================================
echo   ODF API Development Server Restart
echo ========================================
echo.
echo This will restart the API server with higher rate limits for development
echo.
echo Current rate limit issue: 429 Too Many Requests
echo Solution: Restart server to reset rate limit counters
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Stopping any existing API processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 >nul

echo.
echo Starting API server with development configuration...
cd api
set NODE_ENV=development
set RATE_LIMIT_MAX=1000
set RATE_LIMIT_WINDOW=900000

echo.
echo ========================================
echo   API Server Starting...
echo ========================================
echo   Environment: Development
echo   Rate Limit: 1000 requests per 15 min
echo   Port: 5000
echo   Admin bypass: Enabled
echo ========================================
echo.

node server.js
