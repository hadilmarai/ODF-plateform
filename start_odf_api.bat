@echo off
echo ========================================
echo ODF API Server Startup
echo ========================================
echo.

echo Starting ODF API server...
echo This will run both EU and UK funding analysis every 24 hours
echo.

echo API will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

python start_api.py

pause
