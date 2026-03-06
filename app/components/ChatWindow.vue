<template>
  <div class="chat-container">
    <div v-if="authLoading" class="auth-state loading">Đang kiểm tra phiên đăng nhập...</div>

    <div v-else-if="!isAuthenticated" class="auth-state">
      <div class="auth-card">
        <h2>Đăng nhập để bắt đầu chat</h2>
        <p>Vui lòng đăng nhập bằng tài khoản Google để sử dụng hệ thống hội thoại.</p>
        <button class="google-btn" @click="signInWithGoogle">
          <svg viewBox="0 0 24 24" class="btn-icon">
            <path :d="mdiGoogle" />
          </svg>
          <span>Đăng nhập với Google</span>
        </button>
        <p v-if="authError" class="auth-error">{{ authError }}</p>
      </div>
    </div>

    <template v-else>
      <aside class="sidebar">
        <div class="sidebar-header">
          <div>
            <h2>Messenger Lite</h2>
            <p>{{ conversations.length }} cuộc trò chuyện</p>
          </div>
          <button class="logout-btn" title="Đăng xuất" @click="signOut">
            <svg viewBox="0 0 24 24" class="btn-icon">
              <path :d="mdiLogoutVariant" />
            </svg>
          </button>
        </div>

        <div class="user-chip" :title="authUserEmail">
          <svg viewBox="0 0 24 24" class="btn-icon">
            <path :d="mdiAccountCircleOutline" />
          </svg>
          <span>{{ userName }}</span>
        </div>

        <div class="contacts-list">
          <p class="section-label">Danh bạ (chat 1-1)</p>
          <button
            v-for="user in users"
            :key="user.id"
            class="contact-item"
            @click="startDirectChat(user.id)"
          >
            <span class="contact-name">{{ user.display_name }}</span>
            <span class="contact-tag">{{
              getDirectConversationWithUser(user.id) ? 'Đã có chat' : 'Nhắn ngay'
            }}</span>
          </button>
        </div>

        <div class="create-actions">
          <button class="create-btn" @click="showGroupCreator = !showGroupCreator">
            <svg viewBox="0 0 24 24" class="btn-icon">
              <path :d="mdiAccountGroupOutline" />
            </svg>
            Tạo nhóm
          </button>
        </div>

        <div v-if="showGroupCreator" class="creator-card">
          <input v-model="groupName" type="text" class="text-input" placeholder="Tên nhóm" />
          <div class="group-members">
            <label v-for="user in users" :key="user.id" class="member-item">
              <input v-model="selectedGroupMemberIds" type="checkbox" :value="user.id" />
              <span>{{ user.display_name }}</span>
            </label>
          </div>
          <button
            class="creator-submit"
            :disabled="!groupName.trim() || selectedGroupMemberIds.length < 2 || isLoading"
            @click="createGroupChat"
          >
            Tạo nhóm
          </button>
          <p class="hint">Nhóm cần tối thiểu 3 thành viên (bao gồm bạn).</p>
        </div>

        <div class="conversation-list">
          <p class="section-label">Cuộc trò chuyện</p>
          <button
            v-for="conversation in conversations"
            :key="conversation.id"
            class="conversation-item"
            :class="{ active: conversation.id === activeConversationId }"
            @click="openConversation(conversation.id)"
          >
            <div class="conversation-title">{{ conversation.title }}</div>
            <div class="conversation-type">
              {{ conversation.type === 'group' ? 'Nhóm' : '1-1' }}
            </div>
          </button>
        </div>
      </aside>

      <main class="main-chat">
        <div class="chat-header">
          <div class="header-content">
            <div class="chat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="chat-icon-svg">
                <path :d="mdiChatOutline" />
              </svg>
            </div>
            <div class="header-text">
              <h1>{{ activeConversation?.title || 'Chưa chọn cuộc trò chuyện' }}</h1>
              <p>{{ messageCount }} tin nhắn</p>
            </div>
          </div>
        </div>

        <MessageList />
        <MessageInput />
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  mdiAccountCircleOutline,
  mdiAccountGroupOutline,
  mdiChatOutline,
  mdiGoogle,
  mdiLogoutVariant,
} from '@mdi/js'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useChatStore } from '~/stores/chatStore'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'

const chatStore = useChatStore()
const { $supabase } = useNuxtApp()

const messageCount = computed(() => chatStore.messages.length)
const conversations = computed(() => chatStore.conversations)
const users = computed(() => chatStore.users)
const userName = computed(() => chatStore.userName)
const activeConversationId = computed(() => chatStore.activeConversationId)
const activeConversation = computed(() => {
  return (
    chatStore.conversations.find(
      (conversation) => conversation.id === chatStore.activeConversationId,
    ) || null
  )
})
const isLoading = computed(() => chatStore.isLoading)

const authLoading = ref<boolean>(true)
const isAuthenticated = ref<boolean>(false)
const authError = ref<string>('')
const authUserEmail = ref<string>('')
const showGroupCreator = ref<boolean>(false)
const selectedGroupMemberIds = ref<string[]>([])
const groupName = ref<string>('')

type AuthSubscription = ReturnType<typeof $supabase.auth.onAuthStateChange>['data']['subscription']
let authSubscription: AuthSubscription | null = null
let authSyncQueue: Promise<void> = Promise.resolve()

const applySession = async (session: Session | null): Promise<void> => {
  isAuthenticated.value = Boolean(session)
  authUserEmail.value = session?.user?.email || ''
  await chatStore.initializeFromSession(session)
}

const checkSession = async (): Promise<void> => {
  authLoading.value = true
  authError.value = ''

  const { data, error } = await $supabase.auth.getSession()
  if (error) {
    authError.value = 'Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.'
    authLoading.value = false
    return
  }
  await applySession(data.session)
  authLoading.value = false
}

const scheduleSessionSync = (event: AuthChangeEvent, session: Session | null): void => {
  // Avoid calling Supabase APIs inline in auth callback to prevent auth lock contention.
  if (event === 'TOKEN_REFRESHED') {
    authLoading.value = false
    return
  }

  authSyncQueue = authSyncQueue
    .then(async () => {
      await applySession(session)
    })
    .catch((error: unknown) => {
      console.error('[auth.scheduleSessionSync]', { event, error })
      authError.value = 'Không thể đồng bộ phiên đăng nhập. Vui lòng tải lại trang.'
    })
    .finally(() => {
      authLoading.value = false
    })
}

const signInWithGoogle = async (): Promise<void> => {
  authError.value = ''
  const redirectTo = window.location.origin
  const { error } = await $supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  if (error) authError.value = 'Đăng nhập Google thất bại. Vui lòng thử lại.'
}

const signOut = async (): Promise<void> => {
  const { error } = await $supabase.auth.signOut()
  if (error) alert('Đăng xuất thất bại, vui lòng thử lại.')
}

const openConversation = async (conversationId: string): Promise<void> => {
  await chatStore.setActiveConversation(conversationId)
}

const getDirectPeerId = (pairKey: string | null): string | null => {
  if (!pairKey || !chatStore.currentUserId) return null
  const ids = pairKey.split(':').filter(Boolean)
  if (ids.length !== 2) return null
  if (ids[0] === chatStore.currentUserId) return ids[1] ?? null
  if (ids[1] === chatStore.currentUserId) return ids[0] ?? null
  return null
}

const getDirectConversationWithUser = (userId: string) => {
  return (
    conversations.value.find((conversation) => {
      return conversation.type === 'direct' && getDirectPeerId(conversation.pair_key) === userId
    }) || null
  )
}

const startDirectChat = async (userId: string): Promise<void> => {
  const existingConversation = getDirectConversationWithUser(userId)
  if (existingConversation) {
    await openConversation(existingConversation.id)
    return
  }
  const createdId = await chatStore.createDirectConversation(userId)

  // Force sync UI after create to avoid "silent no-op" when remote response is delayed.
  await chatStore.loadConversations()

  const targetConversation = createdId
    ? conversations.value.find((conversation) => conversation.id === createdId) || null
    : getDirectConversationWithUser(userId)

  if (targetConversation) {
    await openConversation(targetConversation.id)
    return
  }

  // Fallback: open by created id even if sidebar list is not hydrated yet.
  if (createdId) {
    await openConversation(createdId)
    return
  }

  alert('Chưa thể mở cuộc trò chuyện 1-1. Vui lòng thử lại.')
}

const createGroupChat = async (): Promise<void> => {
  const createdId = await chatStore.createGroupConversation(
    groupName.value,
    selectedGroupMemberIds.value,
  )
  if (!createdId) {
    alert('Không thể tạo nhóm. Kiểm tra lại tên nhóm và số lượng thành viên.')
    return
  }

  groupName.value = ''
  selectedGroupMemberIds.value = []
  showGroupCreator.value = false
}

onMounted(async () => {
  await checkSession()

  const { data } = $supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => {
      queueMicrotask(() => {
        scheduleSessionSync(event, session)
      })
    },
  )

  authSubscription = data.subscription
})

onUnmounted(() => {
  authSubscription?.unsubscribe()
  chatStore.stopRealtime()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  width: 100%;
  max-width: 1120px;
  height: 100%;
  max-height: 760px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.auth-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9ff 100%);
}

.auth-state.loading {
  color: #667eea;
  font-weight: 600;
}

.auth-card {
  width: 100%;
  max-width: 360px;
  text-align: center;
  background: white;
  border: 1px solid #e5eaf7;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.12);
  padding: 24px;
}

.auth-card h2 {
  margin: 0 0 10px;
  color: #222;
  font-size: 22px;
}

.auth-card p {
  margin: 0 0 16px;
  color: #5d677a;
  font-size: 14px;
}

.google-btn {
  width: 100%;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  padding: 12px;
  color: white;
  background: linear-gradient(135deg, #4285f4 0%, #1a73e8 100%);
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.google-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(26, 115, 232, 0.35);
}

.auth-error {
  margin-top: 10px;
  color: #d32f2f;
  font-size: 13px;
}

.sidebar {
  width: 320px;
  border-right: 1px solid #edf0f8;
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 12px;
  background: #fcfdff;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
  color: #232e43;
}

.sidebar-header p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #7b8498;
}

.logout-btn {
  border: none;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  background: #f0f3ff;
  color: #5167b3;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #dfe7ff;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f4f6ff;
  border: 1px solid #e6eafc;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
  color: #2e3b58;
}

.section-label {
  margin: 0 0 6px;
  font-size: 11px;
  color: #8a93a9;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  max-height: 180px;
}

.contact-item {
  border: 1px solid #e8ecf8;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.contact-item:hover {
  border-color: #cbd6ff;
  background: #f7f9ff;
}

.contact-name {
  font-size: 13px;
  color: #2a3654;
}

.contact-tag {
  font-size: 11px;
  color: #5a72bf;
}

.create-actions {
  display: block;
}

.create-btn {
  width: 100%;
  border: none;
  border-radius: 9px;
  background: #eff3ff;
  color: #415ca9;
  cursor: pointer;
  padding: 8px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.creator-card {
  border: 1px solid #e8ecf8;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
}

.text-input {
  width: 100%;
  border: 1px solid #dbe1f3;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
}

.group-members {
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid #edf0f8;
  border-radius: 8px;
  padding: 6px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 2px;
}

.creator-submit {
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 8px;
  font-size: 13px;
  cursor: pointer;
}

.creator-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  margin: 0;
  font-size: 11px;
  color: #7d8599;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.conversation-item {
  border: 1px solid #e8ecf8;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  padding: 10px;
  cursor: pointer;
}

.conversation-item.active {
  border-color: #667eea;
  background: #f2f5ff;
}

.conversation-title {
  font-size: 14px;
  font-weight: 600;
  color: #253454;
}

.conversation-type {
  font-size: 12px;
  color: #6f7a93;
}

.main-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-icon-svg,
.btn-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.header-text h1 {
  margin: 0;
  font-size: 18px;
}

.header-text p {
  margin: 2px 0 0;
  font-size: 12px;
  opacity: 0.9;
}

@media (max-width: 900px) {
  .chat-container {
    flex-direction: column;
    max-height: none;
    height: calc(100vh - 32px);
  }

  .sidebar {
    width: 100%;
    max-height: 50%;
    border-right: none;
    border-bottom: 1px solid #edf0f8;
  }
}
</style>
