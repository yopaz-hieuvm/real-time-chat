<template>
  <div class="chat-container">
    <div v-if="authLoading" class="auth-state loading">
      Đang kiểm tra phiên đăng nhập...
    </div>

    <div v-else-if="!isAuthenticated" class="auth-state">
      <div class="auth-card">
        <h2>Đăng nhập để bắt đầu chat</h2>
        <p>Vui lòng đăng nhập bằng tài khoản Google trước khi sử dụng phòng chat.</p>
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
          <div class="user-chip" :title="authUserEmail">
            <svg viewBox="0 0 24 24" class="btn-icon">
              <path :d="mdiAccountCircleOutline" />
            </svg>
            <span>{{ userName }}</span>
          </div>
          <button class="clear-btn" @click="clearChat" title="Xóa chat">
            <svg viewBox="0 0 24 24" class="btn-icon">
              <path :d="mdiTrashCanOutline" />
            </svg>
          </button>
          <button class="logout-btn" @click="signOut" title="Đăng xuất">
            <svg viewBox="0 0 24 24" class="btn-icon">
              <path :d="mdiLogoutVariant" />
            </svg>
          </button>
        </div>
      </div>

      <MessageList />
      <MessageInput />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  mdiAccountCircleOutline,
  mdiChatOutline,
  mdiGoogle,
  mdiLogoutVariant,
  mdiTrashCanOutline,
} from '@mdi/js'
import type { AuthChangeEvent, Session, Subscription } from '@supabase/supabase-js'
import { useSupabase } from '~/composables/useSupabase'
import { useChatStore } from '~/stores/chatStore'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'

const chatStore = useChatStore()
const { supabase } = useSupabase()

const messageCount = computed(() => chatStore.messages.length)
const userName = computed(() => chatStore.userName)

const authLoading = ref(true)
const isAuthenticated = ref(false)
const authError = ref('')
const authUserEmail = ref('')
let authSubscription: Subscription | null = null

const applySession = (session: Session | null) => {
  isAuthenticated.value = Boolean(session)

  if (!session?.user) {
    authUserEmail.value = ''
    chatStore.userName = 'Anonymous'
    chatStore.messages = []
    return
  }

  const metadataName = session.user.user_metadata?.full_name || session.user.user_metadata?.name
  const fallbackName = session.user.email?.split('@')[0]
  chatStore.userName = metadataName || fallbackName || 'Anonymous'
  authUserEmail.value = session.user.email || ''
}

const checkSession = async () => {
  authLoading.value = true
  authError.value = ''

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    authError.value = 'Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.'
    authLoading.value = false
    return
  }

  applySession(data.session)
  authLoading.value = false
}

const signInWithGoogle = async () => {
  authError.value = ''
  const redirectTo = window.location.origin
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  if (error) {
    authError.value = 'Đăng nhập Google thất bại. Vui lòng thử lại.'
  }
}

const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    alert('Đăng xuất thất bại, vui lòng thử lại.')
  }
}

const clearChat = () => {
  if (confirm('Bạn có chắc muốn xóa toàn bộ đoạn chat?')) {
    chatStore.clearMessages()
  }
}

onMounted(async () => {
  await checkSession()

  const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
    applySession(session)
    authLoading.value = false
  })

  authSubscription = data.subscription
})

onUnmounted(() => {
  authSubscription?.unsubscribe()
})
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
  margin: 0 0 10px 0;
  color: #222;
  font-size: 22px;
}

.auth-card p {
  margin: 0 0 16px 0;
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
  transition: transform 0.2s, box-shadow 0.2s;
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

.user-chip {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.clear-btn,
.logout-btn {
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

.clear-btn:hover,
.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.clear-btn:active,
.logout-btn:active {
  transform: scale(0.95);
}

.btn-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}
</style>
