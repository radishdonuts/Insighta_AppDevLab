# Vercel Frontend + Local FastAPI Backend + Cloudflare Quick Tunnel

This setup keeps the website on Vercel and exposes the NLP backend from one local PC.

## What runs where

- `frontend/` is deployed to Vercel
- `backend/` runs on one local Windows PC
- Supabase remains the shared database/auth/storage backend
- Cloudflare Quick Tunnel provides the public backend URL

## Backend host checklist

1. Install Python and backend dependencies from `backend/requirements.txt`
2. Make sure the model artifacts exist locally
3. Set:
   - `FRONTEND_URL`
   - `ALLOWED_ORIGINS`
   - `NLP_ARTIFACT_DIR`
4. Run `.\start-fastapi-public.ps1`
5. Run `.\start-cloudflare-quick-tunnel.ps1`
6. Copy the generated `https://...trycloudflare.com` URL

## Vercel checklist

1. Deploy `frontend/`
2. Set the normal frontend env vars
3. Set `FASTAPI_URL` to the current Cloudflare Quick Tunnel URL
4. Redeploy after every `FASTAPI_URL` change

## Ongoing operations

- Keep the backend PC powered on and online
- Keep FastAPI and the tunnel running
- If the tunnel URL changes, update `FASTAPI_URL` in Vercel and redeploy
- If the backend PC is down, the website still loads but new NLP predictions fail
