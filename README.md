# Manga Reader frontend scaffold (Next.js + FastAPI)

This repository contains a Next.js App Router frontend prepared for FastAPI backend integration.

## Stack

- Next.js (TypeScript, App Router)
- React
- `pnpm` package manager

## 1) Install dependencies

```bash
pnpm install
```

## 2) Configure environment

Copy `.env.example` to `.env.local` and adjust values if needed:

```env
FASTAPI_BASE_URL=http://127.0.0.1:8000
VOICE_CLONING_BASE_URL=http://127.0.0.1:8001
NEXT_PUBLIC_API_BASE_PATH=/api/backend
```

## 3) Run FastAPI backend

From your FastAPI project:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 4) Run Next.js app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## FastAPI integration setup

- Client components should call `apiFetch()` from `src/lib/fastapi-client.ts`.
- `apiFetch()` targets `/api/backend/*` by default.
- `src/app/api/backend/[[...path]]/route.ts` proxies requests to `FASTAPI_BASE_URL`.

This avoids browser-side CORS complexity and keeps backend URL details on the server.

## Voice Cloning Integration

The `voice-cloning/` folder is now merged into this project and includes a FastAPI service at `voice-cloning/voice_api.py`.

Run the voice cloning API in a separate terminal:

```bash
cd voice-cloning
uv venv .venv
uv pip install -r requirements.txt
uv run --python .venv/bin/python -m uvicorn voice_api:app --host 127.0.0.1 --port 8001 --reload
```

Next.js proxies all voice-cloning requests to `VOICE_CLONING_BASE_URL` through:

- `/api/voice-cloning/health`
- `/api/voice-cloning/transcribe`
- `/api/voice-cloning/clone`

Example call through Next.js:

```bash
curl -X POST http://127.0.0.1:3000/api/voice-cloning/transcribe \
  -F "reference_audio=@/path/to/reference.m4a" \
  -F "language=English"
```
