<script setup lang="ts">
import { CopilotChat, CopilotKitProvider } from "@copilotkit/vue/v2";
import ResearchProgress from "../components/state-rendering/ResearchProgress.vue";
</script>

<template>
  <!-- HARNESS: doc runtime-url="/api/copilotkit" 404s on Vite (FINDINGS.md); harness runtime on 8120 (server.adk.ts) instead. -->
  <CopilotKitProvider runtime-url="http://localhost:8120/api/copilotkit">
    <ResearchProgress />
    <CopilotChat agent-id="researcher" />
  </CopilotKitProvider>
</template>
