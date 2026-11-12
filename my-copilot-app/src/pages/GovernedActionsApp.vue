<script setup lang="ts">
import { CopilotChat, CopilotKitProvider } from "@copilotkit/vue/v2";
import GovernedActionApproval from "../components/v4/governed/GovernedActionApproval.vue";
import GovernedActionTool from "../components/v4/governed/GovernedActionTool.vue";
</script>

<template>
  <!-- HARNESS: doc runtime-url="/api/copilotkit" (404 on Vite); page shows no backend, so the harness runtime 8120 ("default" = quickstart agent on 8121) -->
  <CopilotKitProvider runtime-url="http://localhost:8120/api/copilotkit">
    <GovernedActionApproval />
    <GovernedActionTool />
    <CopilotChat />
  </CopilotKitProvider>
</template>
