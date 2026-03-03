<template>
  <div class="messages-container">
    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-icon">💬</div>
      <p>Không có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
    </div>
    <div v-for="message in messages" :key="message.id" :class="['message-wrapper', isCurrentUser(message.user_name) ? 'user' : 'bot']">
      <img 
        :src="isCurrentUser(message.user_name) ? '/avatars/user.svg' : '/avatars/bot.svg'" 
        :alt="message.user_name" 
        class="avatar"
      />
      <div class="message-bubble" :class="isCurrentUser(message.user_name) ? 'user' : 'bot'">
        <div class="message-author">{{ message.user_name }}</div>
        <div class="message-text">{{ message.content }}</div>
        <div class="message-time">{{ formatTime(message.created_at) }}</div>
      </div>
    </div>
    <div ref="scrollContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref, onMounted } from 'vue'
import { useChatStore } from '~/stores/chatStore'

const chatStore = useChatStore()
const messages = computed(() => chatStore.messages)
const scrollContainer = ref<HTMLElement>()

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isCurrentUser = (userName: string) => {
  return userName === chatStore.userName
}

onMounted(async () => {
  await chatStore.loadMessages()
  chatStore.subscribeToMessages()
})

watch(
  messages,
  async () => {
    await nextTick()
    scrollContainer.value?.scrollIntoView({ behavior: 'smooth' })
  },
  { deep: true }
)
</script>

<style scoped>
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.message-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  animation: slideIn 0.3s ease-out;
}

.message-wrapper.bot {
  justify-content: flex-start;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.user .avatar {
  order: 2;
}

.message-wrapper.user .message-bubble {
  order: 1;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 14px;
  word-wrap: break-word;
  line-height: 1.4;
}

.message-bubble.bot {
  background: white;
  color: #333;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e0e0;
}

.message-bubble.user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-author {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  opacity: 0.7;
}

.message-text {
  font-size: 14px;
  margin-bottom: 2px;
}

.message-time {
  font-size: 11px;
  opacity: 0.6;
}

.messages-container::-webkit-scrollbar {
  width: 5px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>
