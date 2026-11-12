# Doc: vue/google-adk/generative-ui/tool-rendering (the page's only python block, verbatim).
# src/agents/tool_rendering_common.py
from __future__ import annotations

from random import choice, randint

from google.adk.tools import ToolContext


def get_weather(tool_context: ToolContext, location: str) -> dict:
    """Get the current weather for a given location."""
    return {
        "city": location,
        "temperature": 68,
        "humidity": 55,
        "wind_speed": 10,
        "conditions": "Sunny",
    }


