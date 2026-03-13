param(
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 8000,
  [string]$ArtifactDir = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

function Import-DotEnv {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
      return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (-not $name) {
      return
    }

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if (-not (Test-Path "Env:$name") -or [string]::IsNullOrWhiteSpace((Get-Item "Env:$name").Value)) {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

Import-DotEnv -Path (Join-Path $scriptDir ".env")

if (-not $PSBoundParameters.ContainsKey("Port") -and $env:PORT) {
  $Port = [int]$env:PORT
}

if (-not $ArtifactDir -and $env:NLP_ARTIFACT_DIR) {
  $ArtifactDir = $env:NLP_ARTIFACT_DIR
}

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
