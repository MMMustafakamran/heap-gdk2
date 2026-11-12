# GoogleADK-Vue

Docs QA harness for CopilotKit + Google ADK, Vue: https://docs.copilotkit.ai/vue/google-adk. One route per doc page, doc code verbatim, one clip per page. The goal is to show doc defects; fixes that hide one are banned. Overview, layout and Run: [README.md](README.md).

## Rules

`.qa/` is the vendored copy of the shared tooling and rules (filled by the sync script; never edit it here).

@.qa/instructions/QA-RULES.md
@.qa/instructions/AUTORECORDER.md
@.qa/instructions/VOICE.md
@.qa/instructions/REVIEW.md
@.qa/instructions/REPORT.md

## This repo

- Ports (`start-all.sh`): Vite **5120**, runtime **8120** (`my-copilot-app/server.adk.ts`, one CopilotRuntime per path prefix), ADK quickstart agent **8121** (`backend/main.py`), page agents **8122** (`backend/pages_app.py`), Gemini pool **8129** (`tools/gemini_pool.py`). Never 3000 / 8000; the doc's 5173 / 8200 are overridden.
- The rendered Vue quickstart has no Vue / ADK steps (FINDINGS.md #1): the runtime registers HttpAgents to ADK agents served the way the React ADK quickstart does. HARNESS evidence; the finding stands.
- `backend/agents/shared_chat.py` is a HARNESS stand-in (FINDINGS.md #5); `pages_app.py` `/with-toolset` is evidence for #2 only (recordings use `main.py`).
- Keys: `backend/.env` (`GOOGLE_API_KEY`, `GOOGLE_GEMINI_BASE_URL`), `my-copilot-app/.env.intelligence` (`CPK_INTELLIGENCE_API_KEY`), pool keys via `GEMINI_POOL_KEYFILES` / `GEMINI_POOL_KEYS`. Names in [.env.example](.env.example). Never print or commit them.
- `vite` dev doesn't type-check: `vue-tsc` / `vite build` errors are build-only findings.
- Recorder: `autorecorder/` (`npm run record -- --pages=<id>`, probe: `npx tsx ../.qa/tools/probe.mts <id>`). Finding clips: `actions/new-pages.actions.ts` (`NEW_FINDINGS`), quickstart in `actions/adk.actions.ts`.
