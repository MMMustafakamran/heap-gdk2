<script setup lang="ts">
// HARNESS: the WebMCP page shows OrderSearch.vue only ("must run inside your existing CopilotKitProvider"); provider + chat from the quickstart.
import { CopilotChat, CopilotKitProvider } from "@copilotkit/vue/v2";
import OrderSearch from "../components/v4/webmcp/OrderSearch.vue";
</script>
<template>
  <!-- HARNESS: harness runtime 8120 -->
  <CopilotKitProvider runtime-url="http://localhost:8120/api/copilotkit">
    <OrderSearch />
    <CopilotChat />
  </CopilotKitProvider>
</template>
