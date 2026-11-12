<script setup lang="ts">
// HARNESS: the Sub-Agents page's "Rendering a live delegation log" section has no code at all.
// Plain provider + chat (quickstart) against the page's subagents.py supervisor.
import { CopilotChat, CopilotKitProvider } from "@copilotkit/vue/v2";
</script>
<template>
  <!-- HARNESS: harness runtime on 8120 /subagents -> backend 8122/subagents (subagents_agent.py) -->
  <CopilotKitProvider runtime-url="http://localhost:8120/subagents/api/copilotkit">
    <CopilotChat />
  </CopilotKitProvider>
</template>
