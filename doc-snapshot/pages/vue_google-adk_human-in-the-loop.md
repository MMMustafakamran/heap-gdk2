# HITL Overview

> Allow your agent and users to collaborate on complex tasks.

## What is this?

Human-in-the-loop (HITL) lets an agent pause mid-run to collect input, confirmation, or a choice from the user, then resume with that answer folded back into its reasoning. It's what turns an autonomous workflow into a collaborative one: the agent keeps its context, the user keeps the steering wheel.

<video
  src="https://cdn.copilotkit.ai/docs/copilotkit/images/coagents/human-in-the-loop-example.mp4"
  className="rounded-lg shadow-xl"
  loop
  playsInline
  controls
  autoPlay
  muted
/>

## When should I use this?

Use HITL when you need:

- **Quality control** — a human gate at high-stakes decision points
- **Edge cases** — graceful fallbacks when the agent's confidence is low
- **Expert input** — lean on the user for domain knowledge the model lacks
- **Reliability** — a more robust loop for real-world, production traffic

## Two patterns for HITL in CopilotKit

<Steps>
  <Step>
    ### Install the ADK + AG-UI bridge

    ```bash
    pip install ag-ui-adk
    ```

  </Step>
  <Step>
    ### Add `AGUIToolset()` to your agent

    Tool-based HITL (`useHumanInTheLoop`) registers the picker UI on the
    frontend; CopilotKit forwards the tool definition to your model through
    `AGUIToolset()`. ADK doesn't have a native `interrupt(...)` primitive
    like LangGraph — for graph-paused pauses, use the frontend
    Promise-based `useFrontendTool` pattern instead.

    
~~~~python title="hitl_in_chat_agent.py"
from google.adk.agents import LlmAgent
from ag_ui_adk import AGUIToolset

from agents.shared_chat import get_model, stop_on_terminal_text

# CopilotKit wires into ADK via the `AGUIToolset()` tool: pass it in the
# `tools=` list of your `LlmAgent` to expose CopilotKit's frontend-tool
# channel to the model. `stop_on_terminal_text` is a small ADK callback
# that lets CopilotKit's UI know when the agent has finished its turn.
_INSTRUCTION = (
    "You are a planning assistant. When the user asks you to plan something, "
    "always call generate_task_steps with the proposed list of steps (each "
    "with description + status='enabled'). The frontend will render the "
    "steps inline and the user will confirm or reject — your job is to plan "
    "and call the tool, then summarise the user's decision once they "
    "respond."
)

hitl_in_chat_agent = LlmAgent(
    name="HitlInChatAgent",
    model=get_model(),
    instruction=_INSTRUCTION,
    tools=[AGUIToolset()],
    after_model_callback=stop_on_terminal_text,
)
~~~~


  </Step>
</Steps>

CopilotKit ships two complementary ways to pause an agent turn and ask the human something. They look similar from the outside (the chat pauses, a custom component appears, the user answers, the run resumes), but they're wired differently on the backend, and each has its own niche.

| Pattern | Who decides to pause? | Backend surface |
| --- | --- | --- |
| `useHumanInTheLoop` | The **LLM**, by calling a registered client-side tool | A frontend-only tool description (Zod schema + `render`) |
| `useInterrupt` | The **graph**, by calling `interrupt(...)` during a node | A server-side `interrupt()` call in your agent |

**Pick `useHumanInTheLoop`** when the pause is an _agent-initiated_ decision — the model chose to ask the user — and you want the picker UI inlined into the normal tool-call flow.

**Pick `useInterrupt`** when the pause is a _graph-enforced_ checkpoint — the code path deterministically requires a human answer — and you want the runtime interrupt as the server-side contract.

## Pattern 1 — `useHumanInTheLoop` (tool-based)

The app registers a HITL tool on the client with `useHumanInTheLoop`. When the LLM calls that tool, CopilotKit renders your Vue component and gives it a `respond` callback during the executing phase. The agent sees the answer as the tool result and continues from there.

```vue title="src/components/MeetingApproval.vue"
<script setup lang="ts">
import { z } from "zod";
import { useHumanInTheLoop } from "@copilotkit/vue/v2";
import TimePickerCard from "./TimePickerCard.vue";

useHumanInTheLoop({
  name: "schedule_meeting",
  description: "Ask the user to select a meeting time.",
  parameters: z.object({
    topic: z.string(),
    attendee: z.string(),
  }),
  render: TimePickerCard,
});
</script>

<template><p>Meeting approval tool registered.</p></template>
```

The picker UI can use static candidate slots, live availability, a calendar API, or any other application data. Mount the registration component beneath `CopilotKitProvider` so the composable can reach the runtime.

## Pattern 2 — `useInterrupt` (graph-paused)

With a runtime interrupt, the pause is enforced by the graph itself: a node interrupts with a serializable payload, the run suspends, the client receives the payload, renders a UI, and resumes the run with the user's answer. CopilotKit's `useInterrupt` composable and `CopilotChat`'s `#interrupt` slot form the Vue render contract.

See the [`useInterrupt` deep dive](/vue/google-adk/vue/human-in-the-loop/useInterrupt) for the full walkthrough, including the backend contract and Vue slot wiring.

## Going headless

Both patterns above can drive custom UI. For runtime interrupts, set `renderInChat: false` and use the reactive state returned by `useInterrupt`; for a frontend-tool pause, let the Promise-returning HITL tool drive application state. See the [headless interrupts guide](/vue/google-adk/vue/human-in-the-loop/headless) for the interrupt path.

<IntegrationGrid path="human-in-the-loop" />
