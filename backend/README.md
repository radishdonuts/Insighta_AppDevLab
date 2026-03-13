# Insighta Backend

FastAPI-based NLP backend for Insighta.

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The server will start at `http://127.0.0.1:8000`.

Windows helper:

```powershell
.\run-fastapi.bat
```

## Run as a public backend for a Vercel frontend

Use this when the frontend is deployed on Vercel but the NLP backend still runs on one local PC.

### 1. Start FastAPI on a public bind

```powershell
.\start-fastapi-public.ps1
```

This binds FastAPI to `0.0.0.0:8000` on the local machine.

### 2. Start a Cloudflare Quick Tunnel

Install `cloudflared`, then run:

```powershell
.\start-cloudflare-quick-tunnel.ps1
```

Cloudflare will print a public `https://...trycloudflare.com` URL in the terminal. Use that URL as `FASTAPI_URL` in Vercel.

### 3. Optional combined launcher

```powershell
.\run-public-stack.bat
```

This opens FastAPI in a new PowerShell window and starts the Cloudflare Quick Tunnel in the current window.

### 4. Required backend env

Set these before using the public setup:

```bash
FRONTEND_URL=https://your-vercel-site.vercel.app
ALLOWED_ORIGINS=https://your-vercel-site.vercel.app
NLP_ARTIFACT_DIR=/absolute/path/to/backend/artifacts/distilbert_complaint_twohead_20260305_030951
```

### 5. Required Vercel step

Whenever the Cloudflare Quick Tunnel URL changes:

1. Copy the new public tunnel URL
2. Update `FASTAPI_URL` in Vercel
3. Redeploy the Vercel frontend
4. Re-test `GET /health` and one fresh ticket submission

## Model artifacts

Set `NLP_ARTIFACT_DIR` to the notebook export folder that contains:

- `model/` (DistilBERT weights + tokenizer)
- `label_maps_categoryName.json`
- `label_maps_priority.json`
- `temperature_scaling.json` (optional)
- `nlp_priority_rules.json`
- `inference_config.json`

The backend is fail-fast for artifacts. If the directory or required files are missing,
`POST /nlp/generate` returns `503` and `/health` reports `status: not_ready`.

## Sync from Google Drive shared folder (no Drive Desktop)

Use the sync script to download dataset + a pinned artifact run:

```bash
pip install gdown
python backend/scripts/nlp/sync_from_drive_link.py \
  --folder-url "https://drive.google.com/drive/folders/1CedqRQrTL_VZPPL6FJRv3dTxVHkBXJSE?usp=sharing" \
  --run-id "distilbert_complaint_twohead_20260305_030951"
```

Then point FastAPI to the committed repo artifact path:

```bash
NLP_ARTIFACT_DIR=<repo>/backend/artifacts/distilbert_complaint_twohead_20260305_030951
```

## Endpoints

| Method | Path            | Description                        |
|--------|-----------------|------------------------------------|
| POST   | /nlp/generate   | Return structured NLP scaffold data |
| GET    | /health         | Health check                       |

## Request example

```bash
curl -X POST http://127.0.0.1:8000/nlp/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "My claim was denied unfairly", "ticketId": "optional-uuid", "provider": "fastapi"}'
```

Response shape:

```json
{
  "priority": "Low | Medium | High | null",
  "categoryName": "string | null",
  "confidence": "number | null",
  "confidenceCategory": "number | null",
  "confidencePriority": "number | null",
  "prioritySource": "ml | rule | null",
  "suggestedCategoryName": "string | null",
  "suggestedPriority": "Low | Medium | High | null",
  "priorityRuleDebug": "object | null",
  "rawOutput": "string | null"
}
```
