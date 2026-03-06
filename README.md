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
DOCLING_BASE_URL=http://127.0.0.1:8002
MANGA_PANEL_EXTRACTOR_BASE_URL=http://127.0.0.1:8003
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

The sibling voice-cloning project is now included in this repository at:

```bash
services/voice-cloning
```

It includes a FastAPI service at `services/voice-cloning/voice_api.py`.

Run the voice cloning API in a separate terminal:

```bash
pnpm voice-cloning:install
pnpm dev:voice-cloning
```

Or manually:

```bash
cd services/voice-cloning
uv sync
uv run -m uvicorn voice_api:app --host 127.0.0.1 --port 8001 --reload
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

## Docling Integration

The Docling document parsing microservice is cloned into:

```bash
services/docling-api
```

Install Docling dependencies:

```bash
pnpm docling:install
```

Or manually:

```bash
cd services/docling-api
uv sync
```

Create `services/docling-api/.env` with:

```env
UPLOADTHING_TOKEN=your_uploadthing_token_here
SECRET_KEY=your_docling_api_key_here
```

Run Docling in a separate terminal:

```bash
pnpm dev:docling
```

Or manually:

```bash
cd services/docling-api
uv run fastapi dev main.py --port 8002
```

Next.js proxies Docling requests to `DOCLING_BASE_URL` through:

- `/api/docling/health`
- `/api/docling/docling`
- `/api/docling/docling/full`

Example call through Next.js:

```bash
curl -X POST "http://127.0.0.1:3000/api/docling/docling" \
  -H "Authorization: Bearer your_docling_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/document.pdf"}'
```

## Manga Panel Extractor Integration

The sibling repository is now included at:

```bash
services/manga-panel-extractor
```

Next.js exposes a new endpoint namespace:

- `/api/manga-panel-extractor/*`

Run the extractor API:

```bash
pnpm dev:manga-panel-extractor
```

Or manually:

```bash
cd services/manga-panel-extractor
uv run --with-requirements requirements-api.txt -m uvicorn main:app --host 127.0.0.1 --port 8003 --reload
```

The service exposes:

- `GET /health`
- `POST /extract`

Create `services/manga-panel-extractor/.env` with:

```env
UPLOADTHING_TOKEN=your_uploadthing_token_here
SECRET_KEY=your_manga_panel_extractor_api_key_here
```

`POST /extract` accepts exactly one input source:

- `image_url` (remote image URL), or
- `input_dir` (local directory with image files)

The endpoint extracts panels, uploads all extracted panels to UploadThing, and returns panel URLs.

Example call:

```bash
curl -X POST "http://127.0.0.1:3000/api/manga-panel-extractor/extract" \
  -H "Authorization: Bearer your_manga_panel_extractor_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/manga-page.jpg",
    "fallback": true,
    "split_joint_panels": true,
    "mode": "bounding",
    "merge": "none"
  }'
```
