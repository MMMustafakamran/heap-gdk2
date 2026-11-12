<script setup lang="ts">
import { CopilotChat, CopilotKitProvider } from "@copilotkit/vue/v2";
import StreamingDocument from "../components/v3/StreamingDocument.vue"; // HARNESS: path
</script>

<template>
  <!-- HARNESS: runtime-url -> harness runtime on 8120 (server.adk.ts) -->
  <CopilotKitProvider runtime-url="http://localhost:8120/api/copilotkit">
    <StreamingDocument />
    <CopilotChat agent-id="writer" />
  </CopilotKitProvider>
</template>
