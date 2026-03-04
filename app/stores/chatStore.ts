import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSupabase } from '~/composables/useSupabase'

export interface Message {
  id: string
  content: string
  user_name: string
  created_at: string
  updated_at?: string
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const userName = ref('Anonymous')
  const isLoading = ref(false)
  // supabase client will be acquired lazily inside actions to ensure correct context

  // Lấy tất cả messages từ Supabase
  const loadMessages = async () => {
    const { supabase } = useSupabase()
    if (!supabase) return
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      messages.value = data || []
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // Thêm message mới vào Supabase
  const addMessage = async (content: string) => {
    const { supabase } = useSupabase()
    if (!supabase || !content.trim()) return

    try {
      isLoading.value = true
      const { error } = await supabase
        .from('messages')
        .insert({
          content: content.trim(),
          user_name: userName.value
        })

      if (error) throw error
    } catch (error) {
      console.error('Error adding message:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Subscribe to real-time updates (INSERT, UPDATE, DELETE)
  const subscribeToMessages = () => {
    const { supabase } = useSupabase()
    if (!supabase) return

    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          messages.value.push(payload.new as Message)
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const index = messages.value.findIndex(msg => msg.id === payload.new.id)
          if (index !== -1) {
            messages.value[index] = payload.new as Message
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          messages.value = messages.value.filter(msg => msg.id !== payload.old.id)
        }
      )
      .subscribe()

    return subscription
  }

  // Chỉnh sửa message
  const updateMessage = async (id: string, newContent: string) => {
    const { supabase } = useSupabase()
    if (!supabase || !newContent.trim()) return

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating message:', error)
    }
  }

  // Xóa một message
  const deleteMessage = async (id: string) => {
    const { supabase } = useSupabase()
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  // Xóa tất cả messages
  const clearMessages = async () => {
    const { supabase } = useSupabase()
    if (!supabase) return

    try {
      // run a delete with a simple numeric filter; the small trick is needed
      // because the Supabase client insists on a WHERE clause.
      const { error } = await supabase
        .from('messages')
        .delete()
        .neq('id', 0)   // matches every row because id is never 0

      if (error) {
        console.error('[clearMessages] delete error', error)
        throw error
      }
      messages.value = []

      // refresh in case something else has written during the operation
      await loadMessages()
    } catch (error) {
      console.error('Error deleting messages:', error)
    }
  }

  return {
    messages,
    userName,
    isLoading,
    loadMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    subscribeToMessages,
    clearMessages
  }
})

