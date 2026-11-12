# HARNESS: the Vue ADK quickstart shows no ADK agent (the rendered page is the ADK landing page, and the
# .md export registers BuiltInAgent). This is the React ADK quickstart's main.py (docs.copilotkit.ai/google-adk/quickstart),
# used as the "default" agent for Vue pages that show no backend of their own. Port 8121 (QA-RULES §4).
from fastapi import FastAPI
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from google.adk.agents import LlmAgent

agent = LlmAgent(
    name="assistant",
    model="gemini-3.8-flash",
    instruction="Be helpful and fun!"
)

adk_agent = ADKAgent(
    adk_agent=agent,
    app_name="demo_app",
    user_id="demo_user",
    session_timeout_seconds=3600,
    use_in_memory_services=True
)

app = FastAPI()
add_adk_fastapi_endpoint(app, adk_agent, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8121)  # HARNESS: port 8000 -> 8121
