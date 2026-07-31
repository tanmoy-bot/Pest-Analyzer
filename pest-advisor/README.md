# Grain Guard Advisor

A light-themed, animated web app that takes a pest species (e.g. from EcoSterile
Grain Guard's detections) plus crop/storage details, and returns prevention,
storage, and treatment guidance from an LLM via **OpenRouter**.

The OpenRouter API key lives only in the **backend** (`server/.env`) — it is
never sent to or exposed in the browser.

```
pest-advisor/
├── server/     Express backend — proxies OpenRouter, holds the API key
└── client/     Vite + React frontend — light theme, animated UI
```

## 1. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` and set:
```
OPENROUTER_API_KEY=sk-or-v1-...      # from https://openrouter.ai/keys
OPENROUTER_MODEL=openai/gpt-4o-mini  # or any model slug from openrouter.ai/models
```

Run it:
```bash
npm run dev
```
It starts on `http://localhost:5000` and exposes:
- `GET  /api/health` — sanity check
- `POST /api/advise` — main advice endpoint (also handles follow-up chat via `mode: "chat"`)

## 2. Frontend setup

In a second terminal:
```bash
cd client
npm install
cp .env.example .env    # defaults already point at http://localhost:5000
npm run dev
```
Open the URL Vite prints (usually `http://localhost:5173`).

## 3. Using it

1. Pick a pest species (or choose "Not sure" and describe symptoms instead).
2. Fill in crop / storage type / region — the more context, the better the advice.
3. Submit — you'll get a risk pill, prevention steps, a storage-technique card,
   non-chemical options, and label-guided chemical options.
4. Ask follow-up questions in the box at the bottom of the results; it keeps
   short conversational context.

## 4. Deploying

- **Backend**: Render, Railway, Fly.io, or a Vercel serverless function all work.
  Set `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `ALLOWED_ORIGINS` (your
  deployed frontend URL) as environment variables there — not in the repo.
- **Frontend**: Vercel/Netlify. Set `VITE_API_BASE` to your deployed backend URL.

## 5. Notes on safety

The system prompt explicitly tells the model not to invent exact pesticide
dosages — it's asked to name commonly-labelled product categories and point the
farmer back to the product label and their local Krishi Vigyan Kendra /
agricultural extension officer for exact application rates. The UI also shows
the model's own disclaimer text. Treat this as a first-pass advisor, not a
replacement for a licensed agronomist.

## 6. Ideas to extend

- Wire the pest dropdown to auto-fill from a Grain Guard detection event.
- Add a history log (Supabase) of past queries — "most common pest this season".
- Cache identical (pest, crop, region) queries for a day to cut API costs.
