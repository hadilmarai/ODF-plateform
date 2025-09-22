# ODF API Development Server Restart Script
# Fixes 429 Rate Limit errors by restarting with higher limits

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "   ODF API Development Server Restart" -ForegroundColor Yellow  
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Current issue: 429 Too Many Requests" -ForegroundColor Red
Write-Host "Solution: Restart server to reset rate limit counters" -ForegroundColor Green
Write-Host ""

# Stop any existing Node.js processes
Write-Host "Stopping existing API processes..." -ForegroundColor Cyan
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Set development environment variables
$env:NODE_ENV = "development"
$env:RATE_LIMIT_MAX = "1000"
$env:RATE_LIMIT_WINDOW = "900000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   API Server Starting..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Environment: Development" -ForegroundColor White
Write-Host "   Rate Limit: 1000 requests per 15 min" -ForegroundColor White
Write-Host "   Port: 5000" -ForegroundColor White
Write-Host "   Admin bypass: Enabled" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Change to API directory and start server
Set-Location -Path "api"
node server.js
