<script setup lang="ts">
import { CopilotChat, CopilotKitProvider } from "@copilotkit/vue/v2";
import "@copilotkit/vue/styles.css";
</script>

<template>
  <!-- HARNESS: doc runtime-url="/api/copilotkit" (404 on Vite); harness runtime on 8120 registers "my-agent" -->
  <CopilotKitProvider runtime-url="http://localhost:8120/api/copilotkit">
    <CopilotChat agent-id="my-agent" />
  </CopilotKitProvider>
</template>
