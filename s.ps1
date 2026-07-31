<#
.SYNOPSIS
    Starts the simplified Komute Image Compression ecosystem locally (Native).
#>

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Starting Komute Microservice Ecosystem (Native) " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan


# 1. Start FastAPI Gateway & Frontend
Write-Host "`n[1/1] Starting FastAPI Gateway & Frontend natively..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; if (Test-Path 'venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; Write-Host '[FastAPI Gateway]'; .\venv\Scripts\python.exe -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000"
Write-Host "[OK] FastAPI Gateway launched in a new PowerShell window (Port 8000)." -ForegroundColor Green

Write-Host "`n[INFO] Frontend available at: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "[INFO] Dashboard available at: http://127.0.0.1:8000/dashboard.html" -ForegroundColor Cyan
Write-Host "[INFO] Testing Playground available at: http://127.0.0.1:8000/playground.html" -ForegroundColor Cyan

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "Ecosystem successfully booted natively!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
