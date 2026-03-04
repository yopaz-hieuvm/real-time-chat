<template>
  <div class="input-container">
    <form class="input-form" @submit.prevent="sendMessage">
      <input
        v-model="messageText"
        type="text"
        :placeholder="activeConversationId ? 'Nhập tin nhắn...' : 'Chọn cuộc trò chuyện để nhắn tin'"
        class="text-input"
        :disabled="isDisabled"
      >
      <button type="submit" class="send-btn" :disabled="!messageText.trim() || isDisabled">
        {{ isLoading ? '...' : '➤' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '~/stores/chatStore'

const chatStore = useChatStore()
const messageText = ref<string>('')
const isLoading = computed(() => chatStore.isLoading)
const activeConversationId = computed(() => chatStore.activeConversationId)
const isDisabled = computed(() => isLoading.value || !activeConversationId.value)

const sendMessage = async () => {
  const text = messageText.value.trim()
  if (text && !isDisabled.value) {
    await chatStore.addMessage(text)
    messageText.value = ''
  }
}
</script>

<style scoped>
.input-container {
  flex-shrink: 0;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  background: white;
}

.input-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.text-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-size: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  outline: none;
  transition: border-color 0.2s;
}

.text-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.text-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.text-input::placeholder {
  color: #999;
}

.send-btn {
  padding: 10px 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  font-size: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (min-width: 768px) {
  .text-input {
    font-size: 14px;
  }
}
</style>
