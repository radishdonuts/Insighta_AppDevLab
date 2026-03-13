@echo off
setlocal

set SCRIPT_DIR=%~dp0
start "Insighta FastAPI" powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-fastapi-public.ps1" %*
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-cloudflare-quick-tunnel.ps1"
