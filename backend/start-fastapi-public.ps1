param(
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

Write-Host "Starting public FastAPI binding on 0.0.0.0:$Port"
powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "start-fastapi.ps1") -BindHost "0.0.0.0" -Port $Port -ArtifactDir $ArtifactDir
