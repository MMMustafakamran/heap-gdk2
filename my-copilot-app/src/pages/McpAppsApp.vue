<script setup lang="ts">
import { CopilotChat, CopilotKitProvider } from "@copilotkit/vue/v2";
</script>

<template>
  <!-- HARNESS: doc runtime-url="/api/copilotkit" 404s on Vite (FINDINGS.md); harness runtime on 8120 (server.adk.ts), /mcp path = the MCP Apps runtime. -->
  <CopilotKitProvider runtime-url="http://localhost:8120/mcp/api/copilotkit">
    <main style="height: 100dvh"><CopilotChat /></main>
  </CopilotKitProvider>
</template>
