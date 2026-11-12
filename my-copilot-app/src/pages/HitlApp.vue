<script setup lang="ts">
// HARNESS: the HITL overview shows MeetingApproval.vue only ("mount beneath CopilotKitProvider"); provider + chat added.
import { CopilotChat, CopilotKitProvider } from "@copilotkit/vue/v2";
import MeetingApproval from "../components/v4/hitl/MeetingApproval.vue";
</script>
<template>
  <!-- HARNESS: harness runtime on 8120 /hitl (hitl_in_chat_agent.py from the page) -->
  <CopilotKitProvider runtime-url="http://localhost:8120/hitl/api/copilotkit">
    <MeetingApproval />
    <CopilotChat />
  </CopilotKitProvider>
</template>
