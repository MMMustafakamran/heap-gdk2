# GoogleADK-Vue

QA harness for the CopilotKit docs section https://docs.copilotkit.ai/vue/google-adk (Vue 3 + Vite frontend, Google ADK Python backend). Each doc page is implemented verbatim (HARNESS-marked edits only), probed, and recorded as one clip. Open doc defects: [FINDINGS.md](FINDINGS.md). Page status: [assignment.json](assignment.json).

## Layout

- `my-copilot-app/` Vite app, one root per doc page (`src/App.vue` routes by path), runtime `server.adk.ts`
- `backend/` ADK agents (`uv`): `main.py` quickstart agent, `pages_app.py` page agents, `agents/` the doc's agent files
- `tools/` Gemini key/model pool + OpenAI bridge (HARNESS)
- `autorecorder/` recorder; `narration/` scripts + saved audio; `doc-snapshot/` docs baseline; `.qa/` shared tooling (synced, don't edit)

## Run

```sh
cp .env.example backend/.env   # fill in; my-copilot-app/.env.intelligence for the Threads pages
(cd backend && uv sync) && (cd my-copilot-app && npm install) && (cd autorecorder && npm ci)
bash start-all.sh               # 5120 Vite, 8120 runtime, 8121/8122 ADK, 8129 Gemini pool
cd autorecorder && npx tsx ../.qa/tools/probe.mts --all
npm run record -- --pages=<id>
```
