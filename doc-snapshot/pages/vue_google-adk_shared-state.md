# Shared State

> Create a two-way connection between your UI and agent state.

## What is shared state?

Agentic Copilots maintain a shared state that seamlessly connects your UI with the agent's execution. This shared state system allows you to:

- Display the agent's current progress and intermediate results
- Update the agent's state through UI interactions
- React to state changes in real-time across your application

<ImageZoom
  src="https://cdn.copilotkit.ai/docs/copilotkit/images/coagents/SharedStateCoAgents.gif"
  alt="Shared State Demo"
  width={1000}
  height={1000}
  className="rounded-lg shadow-lg border mt-0"
/>

## When should I use this?

Use shared state when you want the agent and the user to collaborate through the same application state. The agent's outputs are reflected in the UI, and user updates in the UI are reflected in the agent's execution.

<OpsPlatformCTA
  variant="inline"
  title="Building stateful agents?"
  body="Persistent threads ship with CopilotKit Intelligence on the free Developer tier."
  surface="docs_shared_state"
/>

## Reading agent state

<Steps>
  <Step>
    ### Install the ADK + AG-UI bridge

    ```bash
    pip install ag-ui-adk
    ```

  </Step>
  <Step>
    ### Add `AGUIToolset()` to your agent

    Shared state in ADK lives in `tool_context.state` — your tools write to
    it directly and the runtime forwards updates to the UI. Wire your
    `LlmAgent` with `AGUIToolset()` and CopilotKit takes care of the rest.

    
~~~~python title="shared_state_read_write_agent.py"
shared_state_read_write_agent = LlmAgent(
    name="SharedStateReadWriteAgent",
    model=get_model(),
    instruction=_INSTRUCTION,
    tools=[set_notes, AGUIToolset()],
    before_model_callback=_inject_preferences,
    after_model_callback=stop_on_terminal_text,
)
~~~~


    See `src/agents/shared_state_read_write_agent.py` for the bidirectional
    pattern: a before-model callback reads UI-authored preferences out of
    session state, and a `set_notes` tool writes agent-authored notes back.

  </Step>
</Steps>

Subscribe a component to the agent's state with `useAgent`. Any time the agent mutates its state, for example via a tool call, the composable updates its reactive `agent` ref and your UI re-renders with the new values.

```vue title="src/components/SharedWorkspace.vue"
<script setup lang="ts">
import { computed } from "vue";
import { useAgent, UseAgentUpdate } from "@copilotkit/vue/v2";

type WorkspaceState = {
  notes?: string[];
  preferences?: { tone?: string };
};

const { agent } = useAgent({
  agentId: "workspace",
  updates: [UseAgentUpdate.OnStateChanged],
});
const state = computed(
  () => (agent.value?.state ?? {}) as WorkspaceState,
);
</script>

<template>
  <ul>
    <li v-for="note in state.notes ?? []" :key="note">{{ note }}</li>
  </ul>
</template>
```

The returned `agent.value.state` is a plain object. Read it like any other reactive application data and render the parts you care about: agent-written notes, structured outputs, progress indicators, or anything else the agent has put there.

## Writing agent state

The same agent object exposes `setState`. Calling it from a UI event handler pushes the new value into shared state, and the agent reads it back on its next turn. The UI's writes visibly steer the model.

```vue title="src/components/SharedWorkspace.vue"
<script setup lang="ts">
function setTone(tone: string) {
  const current = agent.value;
  if (!current) return;

  const previous = (current.state ?? {}) as WorkspaceState;
  current.setState({
    ...previous,
    preferences: { ...previous.preferences, tone },
  });
}
</script>

<template>
  <button @click="setTone('concise')">Prefer concise answers</button>
</template>
```

This is what makes the channel two-way: the UI doesn't just observe the agent, it can hand the agent fresh inputs — preferences, selections, or partial work — without going through the chat thread.

## Rendering shared state in the UI

Because `agent.state` is plain data exposed through a Vue ref, the UI layer is ordinary Vue. The example above wires the agent's outputs into a list and feeds user edits back through `setState`.

Nothing about this is chat-specific: `useAgent` works in any component under `CopilotKitProvider`, so you can render agent state in your main view or canvas, not just inside the chat panel. See **[Render agent state in your app](/vue/google-adk/vue/shared-state/rendering-in-app)** for the full main-view pattern.

```vue title="src/App.vue"
<script setup lang="ts">
import { CopilotChat, CopilotKitProvider } from "@copilotkit/vue/v2";
import SharedWorkspace from "./components/SharedWorkspace.vue";
</script>

<template>
  <CopilotKitProvider runtime-url="/api/copilotkit">
    <SharedWorkspace />
    <CopilotChat agent-id="workspace" />
  </CopilotKitProvider>
</template>
```

## Streaming partial state updates

By default, agent state only updates *between* backend checkpoints, so a long-running tool call appears as one big burst at the end. State streaming forwards a specific tool argument straight into a state key *as it's being generated*, so the UI can watch the answer assemble token-by-token.

```python
# src/agents/shared_state_streaming_agent.py
from __future__ import annotations

from ag_ui_adk import AGUIToolset
from ag_ui_adk.config import PredictStateMapping
from google.adk.agents import LlmAgent
from google.adk.tools import ToolContext

from agents.shared_chat import get_model, stop_on_terminal_text


def write_document(tool_context: ToolContext, document: str) -> dict:
    """Write a document into shared state.

    Whenever the user asks you to write or draft anything (essay, poem,
    email, summary, etc.), call this tool with the full content as a
    single string. The UI renders state["document"] live as you type.

    Argument name `document` mirrors langgraph-python's `write_document`
    signature so the shared D5 fixture (`tool_argument="document"`) and
    the LGP-aligned PredictStateMapping below stay in lock-step.
    """
    tool_context.state["document"] = document
    return {"status": "ok", "length": len(document)}


_INSTRUCTION = (
    "You are a collaborative writing assistant. Whenever the user asks "
    "you to write, draft, or revise any piece of text, ALWAYS call the "
    "`write_document` tool with the full content as a single string. "
    "Never paste the document into a chat message directly — the document "
    "belongs in shared state and the UI renders it live as you type."
)

shared_state_streaming_agent = LlmAgent(
    name="SharedStateStreamingAgent",
    model=get_model(),
    instruction=_INSTRUCTION,
    tools=[write_document, AGUIToolset()],
    after_model_callback=stop_on_terminal_text,
)


SHARED_STATE_STREAMING_PREDICT_STATE = [
    PredictStateMapping(
        state_key="document",
        tool="write_document",
        tool_argument="document",
        emit_confirm_tool=False,
        stream_tool_call=True,
    ),
]
```

See **[State streaming](/vue/google-adk/vue/shared-state/streaming)** for the full walkthrough, including the corresponding `useAgent` subscription on the frontend.

## Read-only context

When a value is **UI-owned** and the agent should read it but never write it back, such as current user, selected record, or scroll position, reach for `useAgentContext` instead of full shared state. It publishes values as a one-way UI-to-agent channel that auto-unregisters on unmount.

`useAgentContext` is a separate read-only capability; it does not replace the bidirectional `agent.state` / `agent.setState(...)` contract above.

See **[Agent read-only context](/vue/google-adk/vue/shared-state/agent-readonly)** for the full pattern.

<IntegrationGrid path="shared-state" exclude={["agno", "agent-spec", "spring-ai", "langroid"]} />
