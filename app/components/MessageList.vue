<template>
  <div class="messages-container">
    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="empty-icon-svg">
          <path :d="mdiChatOutline" />
        </svg>
      </div>
      <p>Không có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
    </div>
    <div v-for="message in messages" :key="message.id" :class="['message-wrapper', isCurrentUser(message.user_name) ? 'user' : 'bot']">
      <div class="avatar" :aria-label="message.user_name">
        <svg viewBox="0 0 24 24" class="avatar-icon">
          <path :d="isCurrentUser(message.user_name) ? mdiAccountCircle : mdiRobotHappyOutline" />
        </svg>
      </div>
      <div class="message-bubble" :class="isCurrentUser(message.user_name) ? 'user' : 'bot'">
        <div class="message-author">{{ message.user_name }}</div>
        
        <!-- Edit mode -->
        <div v-if="editingId === message.id" class="edit-mode">
          <input
            v-model="editContent"
            type="text"
            class="edit-input"
            @keydown.enter="saveEdit(message.id)"
            @keydown.escape="cancelEdit"
            autofocus
          />
          <div class="edit-actions">
            <button @click="saveEdit(message.id)" class="edit-save" aria-label="Lưu chỉnh sửa">
              <svg viewBox="0 0 24 24" class="edit-action-icon">
                <path :d="mdiCheck" />
              </svg>
            </button>
            <button @click="cancelEdit" class="edit-cancel" aria-label="Hủy chỉnh sửa">
              <svg viewBox="0 0 24 24" class="edit-action-icon">
                <path :d="mdiClose" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Normal view -->
        <template v-else>
          <div class="message-text">{{ message.content }}</div>
          <div class="message-footer">
            <div class="message-time">
              {{ formatTime(message.created_at) }}
              <span v-if="message.updated_at && message.updated_at !== message.created_at" class="edited-badge">
                (chỉnh sửa)
              </span>
            </div>
            <div v-if="isCurrentUser(message.user_name)" class="message-actions">
              <button 
                @click="startEdit(message)" 
                class="action-btn edit-btn"
                title="Chỉnh sửa"
              >
                <svg viewBox="0 0 24 24" class="action-icon">
                  <path :d="mdiPencilOutline" />
                </svg>
              </button>
              <button 
                @click="deleteMsg(message.id)" 
                class="action-btn delete-btn"
                title="Xóa"
              >
                <svg viewBox="0 0 24 24" class="action-icon">
                  <path :d="mdiTrashCanOutline" />
                </svg>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div ref="scrollContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref, onMounted, onUnmounted } from 'vue'
import {
  mdiAccountCircle,
  mdiChatOutline,
  mdiCheck,
  mdiClose,
  mdiPencilOutline,
  mdiRobotHappyOutline,
  mdiTrashCanOutline,
} from '@mdi/js'
import { useChatStore } from '~/stores/chatStore'
import type { Message } from '~/stores/chatStore'

const chatStore = useChatStore()
const messages = computed(() => chatStore.messages)
const scrollContainer = ref<HTMLElement>()
let subscription: any = null

const editingId = ref<string | null>(null)
const editContent = ref('')

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isCurrentUser = (userName: string) => {
  return userName === chatStore.userName
}

const startEdit = (message: Message) => {
  editingId.value = message.id as string
  editContent.value = message.content
}

const saveEdit = async (id: string) => {
  if (editContent.value.trim() && editContent.value !== messages.value.find(m => m.id === id)?.content) {
    await chatStore.updateMessage(id, editContent.value)
  }
  editingId.value = null
  editContent.value = ''
}

const cancelEdit = () => {
  editingId.value = null
  editContent.value = ''
}

const deleteMsg = async (id: string) => {
  if (confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
    await chatStore.deleteMessage(id)
  }
}

onMounted(async () => {
  await chatStore.loadMessages()
  subscription = chatStore.subscribeToMessages()
})

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe()
  }
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
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-icon-svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
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
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e9edf5;
  color: #5f6b7a;
}

.avatar-icon {
  width: 22px;
  height: 22px;
  fill: currentColor;
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
  margin-bottom: 4px;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  gap: 8px;
}

.message-time {
  font-size: 11px;
  opacity: 0.6;
  white-space: nowrap;
}

.edited-badge {
  font-size: 10px;
  opacity: 0.7;
  margin-left: 4px;
  font-style: italic;
}

.message-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  opacity: 0.7;
  transition: opacity 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.action-btn:hover {
  opacity: 1;
}

.action-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.edit-input {
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  font-family: inherit;
}

.message-bubble.bot .edit-input {
  color: #333;
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
}

.edit-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.message-bubble.bot .edit-input::placeholder {
  color: rgba(0, 0, 0, 0.4);
}

.edit-actions {
  display: flex;
  gap: 6px;
}

.edit-save,
.edit-cancel {
  width: 28px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.edit-action-icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.message-bubble.user .edit-save {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.message-bubble.user .edit-save:hover {
  background: rgba(255, 255, 255, 0.3);
}

.message-bubble.user .edit-cancel {
  background: rgba(255, 0, 0, 0.2);
  color: white;
}

.message-bubble.user .edit-cancel:hover {
  background: rgba(255, 0, 0, 0.3);
}

.message-bubble.bot .edit-save {
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
}

.message-bubble.bot .edit-save:hover {
  background: rgba(102, 126, 234, 0.3);
}

.message-bubble.bot .edit-cancel {
  background: rgba(255, 0, 0, 0.1);
  color: #d32f2f;
}

.message-bubble.bot .edit-cancel:hover {
  background: rgba(255, 0, 0, 0.2);
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
