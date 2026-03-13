param(
  [int]$Port = 8000,
  [string]$ArtifactDir = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Starting public FastAPI binding on 0.0.0.0:$Port"
powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "start-fastapi.ps1") -BindHost "0.0.0.0" -Port $Port -ArtifactDir $ArtifactDir
