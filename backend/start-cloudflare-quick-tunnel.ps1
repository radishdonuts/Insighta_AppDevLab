param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

function Resolve-CloudflaredPath {
  $command = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    "C:\Program Files\cloudflared\cloudflared.exe",
    "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    (Join-Path $env:LOCALAPPDATA "Programs\cloudflared\cloudflared.exe")
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  return $null
}

$cloudflaredPath = Resolve-CloudflaredPath
if (-not $cloudflaredPath) {
  throw "cloudflared is not installed or could not be found. Install Cloudflare Tunnel first."
}

$targetUrl = "http://127.0.0.1:$Port"
Write-Host "Starting Cloudflare Quick Tunnel for $targetUrl"
Write-Host "Copy the generated https://...trycloudflare.com URL and use it as FASTAPI_URL in Vercel."

& $cloudflaredPath tunnel --url $targetUrl
