@echo off
setlocal

set SCRIPT_DIR=%~dp0
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-fastapi.ps1" %*

if errorlevel 1 (
  echo.
  echo FastAPI failed to start.
  pause
)
