param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
  throw "cloudflared is not installed or not in PATH. Install Cloudflare Tunnel first."
}

$targetUrl = "http://127.0.0.1:$Port"
Write-Host "Starting Cloudflare Quick Tunnel for $targetUrl"
Write-Host "Copy the generated https://...trycloudflare.com URL and use it as FASTAPI_URL in Vercel."

cloudflared tunnel --url $targetUrl
