// HARNESS: GoogleADK-Vue runtime on port 8120 (QA-RULES §4; doc: 8200). The Vue quickstart registers
// BuiltInAgent only and no Vue ADK page shows how to register an ADK agent in the Node runtime (FINDINGS.md #1),
// so every agent here is an HttpAgent to this repo's ADK backends (React ADK quickstart pattern):
//   8121 backend/main.py        quickstart agent ("default")
//   8122 backend/pages_app.py   the page agents (/hitl, /shared-state, /streaming, /subagents, /tool-rendering)
// Several runtimes on one port, chosen by path prefix (the pages' runtime-url points at the right one):
//   /api/copilotkit           default, my-agent, sales, researcher, workspace, writer (agent ids the pages use)
//   /tools/api/copilotkit     Tool Rendering ("default" -> tool-rendering agent)
//   /hitl/api/copilotkit      HITL Overview ("default" -> hitl_in_chat_agent)
//   /subagents/api/copilotkit Sub-agents
//   /mcp/api/copilotkit       MCP Apps (the page's runtime block, verbatim apart from agent + url)
//   /threads/api/copilotkit   Threads Drawer + Headless Threads (the page's Intelligence runtime block, verbatim)
import { createServer } from "node:http";
import { HttpAgent } from "@ag-ui/client";
import { CopilotKitIntelligence, CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotNodeListener } from "@copilotkit/runtime/v2/node";

try {
  process.loadEnvFile(".env.intelligence"); // HARNESS: local key file (gitignored); CI passes the env var
} catch {}

const Q = process.env.AGENT_URL ?? "http://localhost:8121"; // quickstart agent
const P = process.env.PAGES_URL ?? "http://localhost:8122"; // page agents
const quick = () => new HttpAgent({ url: `${Q}/` });
const page = (p: string) => new HttpAgent({ url: `${P}/${p}` });

const main = new CopilotRuntime({
  agents: {
    default: quick(),
    "my-agent": quick(), // HARNESS: Prebuilt Components / Headless UI agent-id, never registered on any page
    sales: page("hitl"), // HARNESS: Programmatic Control's agentId "sales"; the page's agent is hitl_in_chat_agent.py
    researcher: page("streaming"), // HARNESS: State Rendering's agentId; the page's agent is shared_state_streaming_agent.py
    workspace: page("shared-state"), // HARNESS: Shared State's agentId; the page's agent is shared_state_read_write_agent.py
    writer: page("streaming"), // HARNESS: State Streaming's agentId
  },
});
const tools = new CopilotRuntime({ agents: { default: page("tool-rendering") } });
const hitl = new CopilotRuntime({ agents: { default: page("hitl") } });
const subagents = new CopilotRuntime({ agents: { default: page("subagents") } });

const agent = quick(); // HARNESS: the MCP Apps and Headless Threads snippets use an undefined `agent`

// --- MCP Apps doc (verbatim except url) ---
const mcpRuntime = new CopilotRuntime({
  agents: { default: agent },
  mcpApps: {
    servers: [
      {
        type: "http",
        url: process.env.MCP_URL ?? "https://mcp.excalidraw.com/mcp", // HARNESS: doc has the placeholder https://mcp.example.com/mcp; Excalidraw is the docs' own example server
        serverId: "support-tools",
      },
    ],
  },
});
// --- end doc ---

async function verifyAppSession(_request: Request) {
  return { user: { id: "adk-vue-qa-user", name: "ADK Vue QA" } }; // HARNESS: the snippet calls verifyAppSession, never defined; no auth here
}

// --- Headless Threads doc, step 1 server.ts (verbatim; the Threads Drawer page shows no runtime and uses it too) ---
const threadsRuntime = new CopilotRuntime({
  agents: {
    default: agent,
    support: agent, // HARNESS: the Threads Drawer page's agent-id="support", never registered on the page
    "my-agent": agent, // HARNESS: Headless Threads' agent-id="my-agent"; its server.ts registers only `default`
  },
  intelligence: new CopilotKitIntelligence({
    apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
  }),
  identifyUser: async (request) => {
    const session = await verifyAppSession(request);
    if (!session?.user) throw new Error("Unauthorized");
    return { id: session.user.id, name: session.user.name };
  },
  // generateThreadNames: false,
  // lockTtlSeconds: 20,
  // lockHeartbeatIntervalSeconds: 15,
  // lockKeyPrefix: "my-app",
});
// --- end doc ---

const listen = (runtime: CopilotRuntime, prefix: string) =>
  createCopilotNodeListener({ runtime, basePath: `${prefix}/api/copilotkit`, cors: true });
const routes: [string, ReturnType<typeof listen>][] = [
  ["/tools/", listen(tools, "/tools")],
  ["/hitl/", listen(hitl, "/hitl")],
  ["/subagents/", listen(subagents, "/subagents")],
  ["/mcp/", listen(mcpRuntime, "/mcp")],
  ["/threads/", listen(threadsRuntime, "/threads")],
];
const fallback = listen(main, "");

const port = Number(process.env.PORT ?? 8120);
createServer((req, res) => {
  const u = req.url ?? "";
  const hit = routes.find(([p]) => u.startsWith(p));
  return (hit ? hit[1] : fallback)(req, res);
}).listen(port, () => console.log(`GoogleADK-Vue runtime listening at http://localhost:${port}`));
