# HARNESS: one FastAPI app on 8122 mounting the agents the Vue ADK pages print, one path per page.
# No Vue page shows the ADKAgent / add_adk_fastapi_endpoint wiring for its agent; it follows the React ADK
# quickstart (backend/main.py). Agent files in agents/ are the doc's code (see each file's header).
from fastapi import FastAPI
from ag_ui_adk import ADKAgent, AGUIToolset, add_adk_fastapi_endpoint
from google.adk.agents import LlmAgent

from agents.hitl_in_chat_agent import hitl_in_chat_agent
from agents.shared_state_read_write_agent import shared_state_read_write_agent
from agents.shared_state_streaming_agent import (
    shared_state_streaming_agent,
    SHARED_STATE_STREAMING_PREDICT_STATE,
)
from agents.subagents_agent import subagents_root_agent
from agents.tool_rendering_common import get_weather


def _wrap(a, **kw):
    return ADKAgent(adk_agent=a, app_name="demo_app", user_id="demo_user",
                    session_timeout_seconds=3600, use_in_memory_services=True, **kw)


# HARNESS: the Tool Rendering page prints get_weather only (its setup step is "not bundled for google-adk");
# minimal LlmAgent around it, like the quickstart agent.
tool_rendering_agent = LlmAgent(
    name="ToolRenderingAgent",
    model="gemini-3.8-flash",
    instruction="Use get_weather when the user asks about the weather.",
    tools=[get_weather, AGUIToolset()],
)

app = FastAPI()
add_adk_fastapi_endpoint(app, _wrap(hitl_in_chat_agent), path="/hitl")
add_adk_fastapi_endpoint(app, _wrap(shared_state_read_write_agent), path="/shared-state")
# HARNESS: the pages define SHARED_STATE_STREAMING_PREDICT_STATE but never show where it goes;
# ADKAgent(predict_state=...) is the ag_ui_adk parameter for it.
add_adk_fastapi_endpoint(app, _wrap(shared_state_streaming_agent, predict_state=SHARED_STATE_STREAMING_PREDICT_STATE), path="/streaming")
add_adk_fastapi_endpoint(app, _wrap(subagents_root_agent), path="/subagents")
add_adk_fastapi_endpoint(app, _wrap(tool_rendering_agent), path="/tool-rendering")

# HARNESS (evidence, FINDINGS.md #2): the quickstart agent plus AGUIToolset(), the step the HITL / Programmatic
# Control pages show but the Frontend Tools, Components as Tools, Governed Actions and WebMCP pages never mention.
# Only used to confirm what was missing (runtime AGENT_URL=http://localhost:8122/with-toolset); recordings use main.py.
quickstart_with_toolset = LlmAgent(
    name="assistant",
    model="gemini-3.8-flash",
    instruction="Be helpful and fun!",
    tools=[AGUIToolset()],
)
add_adk_fastapi_endpoint(app, _wrap(quickstart_with_toolset), path="/with-toolset")
