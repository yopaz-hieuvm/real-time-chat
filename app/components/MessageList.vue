<template>
  <div class="messages-container">
    <div v-if="!activeConversationId" class="empty-state">
      <p>Chọn một cuộc trò chuyện để bắt đầu.</p>
    </div>

    <div v-else-if="messages.length === 0" class="empty-state">
      <div class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="empty-icon-svg">
          <path :d="mdiChatOutline" />
        </svg>
      </div>
      <p>Chưa có tin nhắn nào trong cuộc trò chuyện này.</p>
    </div>

    <div
      v-for="message in messages"
      :key="message.id"
      :class="['message-wrapper', isCurrentUser(message.sender_id) ? 'user' : 'bot']"
    >
      <div class="avatar" :aria-label="message.sender_name">
        <svg viewBox="0 0 24 24" class="avatar-icon">
          <path :d="isCurrentUser(message.sender_id) ? mdiAccountCircle : mdiAccountGroupOutline" />
        </svg>
      </div>
      <div class="message-bubble" :class="isCurrentUser(message.sender_id) ? 'user' : 'bot'">
        <div class="message-author">{{ message.sender_name }}</div>

        <div v-if="editingId === message.id" class="edit-mode">
          <input
            v-model="editContent"
            type="text"
            class="edit-input"
            autofocus
            @keydown.enter="saveEdit(message.id)"
            @keydown.escape="cancelEdit"
          />
          <div class="edit-actions">
            <button class="edit-save" aria-label="Lưu chỉnh sửa" @click="saveEdit(message.id)">
              <svg viewBox="0 0 24 24" class="edit-action-icon">
                <path :d="mdiCheck" />
              </svg>
            </button>
            <button class="edit-cancel" aria-label="Hủy chỉnh sửa" @click="cancelEdit">
              <svg viewBox="0 0 24 24" class="edit-action-icon">
                <path :d="mdiClose" />
              </svg>
            </button>
          </div>
        </div>

        <template v-else>
          <div class="message-text">{{ message.content }}</div>
          <div class="message-footer">
            <div class="message-time">
              {{ formatTime(message.created_at) }}
              <span
                v-if="message.updated_at && message.updated_at !== message.created_at"
                class="edited-badge"
              >
                (chỉnh sửa)
              </span>
            </div>
            <div v-if="isCurrentUser(message.sender_id)" class="message-actions">
              <button class="action-btn edit-btn" title="Chỉnh sửa" @click="startEdit(message)">
                <svg viewBox="0 0 24 24" class="action-icon">
                  <path :d="mdiPencilOutline" />
                </svg>
              </button>
              <button class="action-btn delete-btn" title="Xóa" @click="deleteMsg(message.id)">
                <svg viewBox="0 0 24 24" class="action-icon">
                  <path :d="mdiTrashCanOutline" />
                </svg>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div ref="scrollContainer" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref } from 'vue'
import {
  mdiAccountCircle,
  mdiAccountGroupOutline,
  mdiChatOutline,
  mdiCheck,
  mdiClose,
  mdiPencilOutline,
  mdiTrashCanOutline,
} from '@mdi/js'
import { useChatStore } from '~/stores/chatStore'
import type { ChatMessage } from '~/stores/chatStore'

const chatStore = useChatStore()
const messages = computed(() => chatStore.messages)
const activeConversationId = computed(() => chatStore.activeConversationId)
const scrollContainer = ref<HTMLElement | null>(null)

const editingId = ref<string | null>(null)
const editContent = ref<string>('')

const formatTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isCurrentUser = (senderId: string): boolean => {
  return senderId === chatStore.currentUserId
}

const startEdit = (message: ChatMessage): void => {
  editingId.value = message.id
  editContent.value = message.content
}

const saveEdit = async (id: string): Promise<void> => {
  const existing = messages.value.find((message) => message.id === id)
  if (!existing) return

  if (editContent.value.trim() && editContent.value !== existing.content) {
    await chatStore.updateMessage(id, editContent.value)
  }

  editingId.value = null
  editContent.value = ''
}

const cancelEdit = (): void => {
  editingId.value = null
  editContent.value = ''
}

const deleteMsg = async (id: string): Promise<void> => {
  if (confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
    await chatStore.deleteMessage(id)
  }
}

watch(
  messages,
  async () => {
    await nextTick()
    scrollContainer.value?.scrollIntoView({ behavior: 'smooth' })
  },
  { deep: true },
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
  border: 1px solid #e5e5e5;
  color: #222;
}

.message-bubble.user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-author {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  opacity: 0.85;
}

.message-text {
  white-space: pre-wrap;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.message-time {
  font-size: 11px;
  opacity: 0.8;
}

.edited-badge {
  margin-left: 4px;
}

.message-actions {
  display: flex;
  gap: 6px;
}

.action-btn,
.edit-save,
.edit-cancel {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px;
  color: inherit;
  opacity: 0.8;
}

.action-btn:hover,
.edit-save:hover,
.edit-cancel:hover {
  opacity: 1;
}

.action-icon,
.edit-action-icon {
  width: 15px;
  height: 15px;
  fill: currentColor;
}

.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  outline: none;
}

.message-bubble.bot .edit-input {
  border-color: #d2d7e5;
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
