#!/usr/bin/env bash
# HARNESS: starts every GoogleADK-Vue server on its harness port (QA-RULES §4: never 3000/8000).
#   8129 Gemini key/model pool (tools/gemini_pool.py, OpenAI fallback); backend/.env sets GOOGLE_GEMINI_BASE_URL to it
#   8121 quickstart ADK agent (backend/main.py, React ADK quickstart; the Vue quickstart shows none, FINDINGS.md #1)
#   8122 page agents (backend/pages_app.py: /hitl /shared-state /streaming /subagents /tool-rendering)
#   8120 runtime (my-copilot-app/server.adk.ts; doc: 8200), one runtime per path prefix
#   5120 Vite (doc: 5173)
# Keys: backend/.env (GOOGLE_API_KEY, GOOGLE_GEMINI_BASE_URL), my-copilot-app/.env.intelligence
# (CPK_INTELLIGENCE_API_KEY) or the env. Pool keys: GEMINI_POOL_KEYS / GEMINI_POOL_KEYFILES. Names in .env.example.
cd "$(dirname "$0")"
mkdir -p logs

(cd backend && PORT=8129 uv run python ../tools/gemini_pool.py > ../logs/gemini-pool-8129.log 2>&1) &
(cd backend && uv run --env-file .env uvicorn main:app --port 8121 > ../logs/backend-8121.log 2>&1) &
(cd backend && uv run --env-file .env uvicorn pages_app:app --port 8122 > ../logs/backend-8122.log 2>&1) &

cd my-copilot-app
(PORT=8120 npx tsx server.adk.ts > ../logs/runtime-8120.log 2>&1) &
(npm run dev > ../logs/vite-5120.log 2>&1) &
wait
