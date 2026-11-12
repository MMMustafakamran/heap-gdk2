# FINDINGS — GoogleADK-Vue

Open doc defects found implementing https://docs.copilotkit.ai/vue/google-adk (Vue frontend + Google ADK Python backend).
Stack: @copilotkit/vue 1.85.0, @copilotkit/runtime 1.85.0 (declared ^1.85.0), vue 3.5.45, vite 8.3.6, tsx 4.23.15; ag-ui-adk 0.12.0, google-adk 2.14.0, google-genai 2.34.0, fastapi 0.162.4; Python 3.13.15, Node 26.7.0, npm 12.0.2; Microsoft Windows 11 Pro. Docs: https://docs.copilotkit.ai/vue/google-adk (snapshot 2026-11-12).

## Dev blockers

### [Quickstart](https://docs.copilotkit.ai/vue/google-adk)
**#1 The Vue quickstart has no Vue or ADK steps.**
- **Doc:** the sidebar's Quickstart renders the ADK landing page ("Bring your ADK agents into any app", a "Start building" setup-prompt wizard). No `npm create vue`, no `@copilotkit/vue` install, no runtime, no ADK agent. The `.md` export instead shows the generic Vue quickstart, which registers `BuiltInAgent` and tells ADK users to "use your framework's quickstart for the runtime wiring".
- **Result:** no Vue page shows how to register an ADK agent in the Node runtime. **Confirmed by harness:** `server.adk.ts` registers `HttpAgent`s to ADK agents served with the React ADK quickstart's `ADKAgent` + `add_adk_fastapi_endpoint` (`backend/main.py`).

### [Frontend Tools](https://docs.copilotkit.ai/vue/google-adk/frontend-tools), [Components as Tools](https://docs.copilotkit.ai/vue/google-adk/generative-ui/tool-based), [Governed Action Approval UI](https://docs.copilotkit.ai/vue/google-adk/human-in-the-loop/governed-actions)
**#2 No agent-side step: an ADK agent without `AGUIToolset()` never receives the frontend tools.**
- **Doc:** the pages show only the Vue side (`useFrontendTool`, `useComponent`, `useHumanInTheLoop`). The `AGUIToolset()` step appears only on the HITL / Programmatic Control pages.
- **Result:** with the ADK quickstart agent, "Show only sev1 incidents" gets a text answer and the filter stays `all`; the weather card is typed as text, no `WeatherCard`; the governed-action agent says it has no tools, no approval card.
- **Confirmed by harness:** the same agent with `tools=[AGUIToolset()]` (`backend/pages_app.py` `/with-toolset`) filters the list, renders the card and shows the approval card.

### [State Rendering](https://docs.copilotkit.ai/vue/google-adk/generative-ui/state-rendering)
**#3 The UI reads state keys the page's agent never writes.**
- **Doc:** `type ResearchState = { status?: string; draft?: string; completed?: number; total?: number };` vs the agent's `tool_context.state["document"] = document`.
- **Result:** the agent says the draft is "in the document view", the progress panel stays on `Idle` with an empty bar.

### [Shared State](https://docs.copilotkit.ai/vue/google-adk/shared-state)
**#4 The agent snippet uses names it never defines.**
- **Doc:** only the `LlmAgent(...)` call: `tools=[set_notes, AGUIToolset()]`, `before_model_callback=_inject_preferences`, `instruction=_INSTRUCTION`, `model=get_model()`, no imports; "See `src/agents/shared_state_read_write_agent.py`" (not linked).
- **Error:** `NameError` as written. **Confirmed by harness:** works with the showcase file (`backend/agents/shared_state_read_write_agent.py`).

### [HITL Overview](https://docs.copilotkit.ai/vue/google-adk/human-in-the-loop), [Programmatic Control](https://docs.copilotkit.ai/vue/google-adk/programmatic-control), [Sub-agents](https://docs.copilotkit.ai/vue/google-adk/multi-agent/subagents)
**#5 Agent files import `agents.shared_chat`, which these pages never show or link.**
- **Doc:** `from agents.shared_chat import get_model, stop_on_terminal_text`.
- **Error:** `ModuleNotFoundError: No module named 'agents.shared_chat'`; the backend won't start. **Confirmed by harness:** minimal stand-in `backend/agents/shared_chat.py`.
- HITL also: `import TimePickerCard from "./TimePickerCard.vue";` never shown, and the agent prompt asks for `generate_task_steps` while the Vue tool is `schedule_meeting`.
- Programmatic Control also: `useAgent({ agentId: "sales" })`, `sales` never registered; nothing on the page shows the run's reply.

### [Agent Read-Only Context](https://docs.copilotkit.ai/vue/google-adk/shared-state/agent-readonly)
**#6 The agent never sees the `useAgentContext` value.**
- **Doc:** "Surfaced to the agent through the backend's CopilotKit middleware on every turn." No backend code.
- **Result:** asked "Which workspace am I in right now?", the agent says it can't see that (same with `AGUIToolset()` on the agent).

### [MCP Apps](https://docs.copilotkit.ai/vue/google-adk/generative-ui/mcp-apps)
**#7 Runtime snippet uses an undefined `agent` and a placeholder server; filled in, the app never renders.**
- **Doc:** `agents: { default: agent },` and `url: "https://mcp.example.com/mcp"`.
- **Result:** with an ADK agent and the Excalidraw MCP server: `Error: [CopilotKit] Timed out waiting for agent to become idle`, then the agent claims it drew the chart; no app frame.

### [WebMCP](https://docs.copilotkit.ai/vue/google-adk/webmcp)
**#8 `OrderSearch.vue` calls `searchOrders()`, which the page never defines.**
- **Result:** asked to use the searchOrders tool, the chat never replies.

### [Sub-agents](https://docs.copilotkit.ai/vue/google-adk/multi-agent/subagents)
**#9 "Rendering a live delegation log" has no code.**
- **Doc:** "On the frontend, the delegation log is a reactive render of the `delegations` slot." followed by nothing.
- **Result:** the supervisor replies (with #5's stand-in) but there is no delegation log to build.

## Minor notes

- **#10** Most pages use `runtime-url="/api/copilotkit"`, which 404s on Vite (the quickstart uses the full `http://localhost:8200/api/copilotkit`).
- **#11** Agent ids `my-agent` (Prebuilt Components, Headless UI, Headless Threads) and `support` (Threads Drawer) are never registered on any runtime shown.
- **#12** Tool Call Rendering prints only `get_weather` (its setup step is "not bundled for google-adk"), no agent around it; `WeatherToolCard` reads `parameters.city` but the tool's arg is `location`, so the card header is blank.
- **#13** Headless Threads' `server.ts` uses `agent` and `verifyAppSession` without defining them.
- **#14** State Streaming / State Rendering link the showcase `shared_chat.py`, which itself imports the unpublished `agents._header_forwarding`; `SHARED_STATE_STREAMING_PREDICT_STATE` is defined but never passed to `ADKAgent(predict_state=...)`.
- **#15** Dead in-section links with a doubled `/vue/google-adk/vue/...` path (Prebuilt Components → chat/popup/sidebar/chat-controls, Shared State pages → each other) 404.
