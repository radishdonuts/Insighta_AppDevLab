param(
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 8000,
  [string]$ArtifactDir = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not $ArtifactDir) {
  $defaultArtifact = Join-Path $scriptDir "artifacts\distilbert_complaint_twohead_20260305_030951"
  if (Test-Path $defaultArtifact) {
    $ArtifactDir = (Resolve-Path $defaultArtifact).Path
  }
}

if (-not $ArtifactDir) {
  throw "NLP artifact directory not found. Pass -ArtifactDir <path>."
}

if (-not (Test-Path $ArtifactDir)) {
  throw "ArtifactDir does not exist: $ArtifactDir"
}

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
  throw "Python is not installed or not in PATH."
}

$env:NLP_ARTIFACT_DIR = $ArtifactDir
Write-Host "NLP_ARTIFACT_DIR=$($env:NLP_ARTIFACT_DIR)"
Write-Host "Starting FastAPI on http://$BindHost`:$Port ..."

python -m uvicorn main:app --host $BindHost --port $Port
