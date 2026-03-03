<template>
  <div class="chat-container">
    <div class="chat-header">
      <div class="header-content">
        <div class="chat-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="chat-icon-svg">
            <path :d="mdiChatOutline" />
          </svg>
        </div>
        <div class="header-text">
          <h1>Realtime Chat</h1>
          <p>{{ messageCount }} tin nhắn</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="username-btn" @click="showUserInput = true" title="Đặt tên">
          <svg viewBox="0 0 24 24" class="btn-icon">
            <path :d="mdiAccountCircleOutline" />
          </svg>
          <span>{{ userName }}</span>
        </button>
        <button class="clear-btn" @click="clearChat" title="Xóa chat">
          <svg viewBox="0 0 24 24" class="btn-icon">
            <path :d="mdiTrashCanOutline" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Username Input Modal -->
    <div v-if="showUserInput" class="modal-overlay" @click="showUserInput = false">
      <div class="modal-content" @click.stop>
        <h3>Đặt tên của bạn</h3>
        <input
          v-model="tempUserName"
          type="text"
          placeholder="Nhập tên..."
          class="modal-input"
          @keydown.enter="setUserName"
        />
        <div class="modal-actions">
          <button class="btn-cancel" @click="showUserInput = false">Hủy</button>
          <button class="btn-ok" @click="setUserName">OK</button>
        </div>
      </div>
    </div>

    <MessageList />
    <MessageInput />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiAccountCircleOutline, mdiChatOutline, mdiTrashCanOutline } from '@mdi/js'
import { useChatStore } from '~/stores/chatStore'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'

const chatStore = useChatStore()
const messageCount = computed(() => chatStore.messages.length)
const userName = computed(() => chatStore.userName)

const showUserInput = ref(false)
const tempUserName = ref(chatStore.userName)

const setUserName = () => {
  const name = tempUserName.value.trim()
  if (name) {
    chatStore.userName = name
    showUserInput.value = false
  }
}

const clearChat = () => {
  if (confirm('Bạn có chắc muốn xóa toàn bộ đoạn chat?')) {
    chatStore.clearMessages()
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 500px;
  height: 100%;
  max-height: 700px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.chat-header {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-icon {
  width: 32px;
  height: 32px;
}

.chat-icon-svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.header-text h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.header-text p {
  margin: 4px 0 0 0;
  font-size: 12px;
  opacity: 0.85;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.username-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.username-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.clear-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.clear-btn:active {
  transform: scale(0.95);
}

.btn-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 300px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
  box-sizing: border-box;
  outline: none;
}

.modal-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-cancel,
.btn-ok {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-ok {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-ok:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-ok:active {
  transform: scale(0.98);
}
</style>
