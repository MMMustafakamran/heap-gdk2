# Doc: vue/google-adk/shared-state/streaming + generative-ui/state-rendering + shared-state (same python block, verbatim)
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
