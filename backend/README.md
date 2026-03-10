# Insighta Backend

FastAPI-based NLP backend for Insighta.

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The server will start at `http://127.0.0.1:8000`.

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
