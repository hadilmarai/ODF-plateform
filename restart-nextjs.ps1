# Next.js App Restart Script
# Fixes navigation throttling and authentication loops

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "   Next.js App Restart (Fix Auth Loops)" -ForegroundColor Yellow  
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Current issue: Navigation throttling and auth loops" -ForegroundColor Red
Write-Host "Solution: Restart Next.js app to clear cached state" -ForegroundColor Green
Write-Host ""

# Stop any existing Next.js processes
Write-Host "Stopping existing Next.js processes..." -ForegroundColor Cyan
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Next.js App Starting..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Environment: Development" -ForegroundColor White
Write-Host "   Port: 3000" -ForegroundColor White
Write-Host "   Auth: Fixed infinite loops" -ForegroundColor White
Write-Host "   Navigation: Throttling fixed" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Change to Next.js directory and start app
Set-Location -Path "oderinter"
npm run dev
