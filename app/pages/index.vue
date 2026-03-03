<template>
  <div class="page-wrapper">
    <ChatWindow />
  </div>
</template>

<script setup lang="ts">
import ChatWindow from '~/components/ChatWindow.vue'
</script>

<style scoped>
.page-wrapper {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px;
  box-sizing: border-box;
}
</style>
