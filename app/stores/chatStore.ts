import type { RealtimeChannel, RealtimePostgresChangesPayload, Session } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSupabase } from '~/composables/useSupabase'

export interface ChatMessage {
  id: string
  conversation_id: string
  content: string
  sender_id: string
  sender_name: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  display_name: string
  email: string | null
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  name: string | null
  pair_key: string | null
  created_by: string
  created_at: string
  members: UserProfile[]
  title: string
}

interface ConversationRow {
  id: string
  type: 'direct' | 'group'
  name: string | null
  pair_key: string | null
  created_by: string
  created_at: string
}

interface ConversationMemberWithConversationRow {
  conversation_id: string
  conversations: ConversationRow | null
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toConversationRow = (value: unknown): ConversationRow | null => {
  if (!isRecord(value)) return null

  const { id, type, name, pair_key, created_by, created_at } = value
  if (
    typeof id !== 'string'
    || (type !== 'direct' && type !== 'group')
    || (name !== null && typeof name !== 'string')
    || (pair_key !== null && typeof pair_key !== 'string')
    || typeof created_by !== 'string'
    || typeof created_at !== 'string'
  ) {
    return null
  }

  return {
    id,
    type,
    name,
    pair_key,
    created_by,
    created_at,
  }
}

const toChatMessage = (value: unknown): ChatMessage | null => {
  if (!isRecord(value)) return null

  const { id, conversation_id, content, sender_id, sender_name, created_at, updated_at } = value
  if (
    typeof id !== 'string'
    || typeof conversation_id !== 'string'
    || typeof content !== 'string'
    || typeof sender_id !== 'string'
    || typeof sender_name !== 'string'
    || typeof created_at !== 'string'
    || typeof updated_at !== 'string'
  ) {
    return null
  }

  return {
    id,
    conversation_id,
    content,
    sender_id,
    sender_name,
    created_at,
    updated_at,
  }
}

const getDirectPairKey = (userA: string, userB: string): string => {
  return [userA, userB].sort().join(':')
}

const getPeerIdFromPairKey = (pairKey: string | null, currentUserId: string): string | null => {
  if (!pairKey) return null
  const ids = pairKey.split(':').filter(Boolean)
  if (ids.length !== 2) return null

  if (ids[0] === currentUserId) return ids[1]
  if (ids[1] === currentUserId) return ids[0]
  return null
}

const buildConversationTitle = (
  conversation: ConversationRow,
  members: UserProfile[],
  currentUserId: string,
  usersById: Map<string, UserProfile>,
): string => {
  if (conversation.type === 'group') {
    return conversation.name || 'Nhóm chưa đặt tên'
  }

  const otherMember = members.find(member => member.id !== currentUserId)
  if (otherMember) return otherMember.display_name

  const peerId = getPeerIdFromPairKey(conversation.pair_key, currentUserId)
  if (!peerId) return 'Đoạn chat 1-1'

  return usersById.get(peerId)?.display_name || `Người dùng ${peerId.slice(0, 8)}`
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const conversations = ref<Conversation[]>([])
  const users = ref<UserProfile[]>([])
  const activeConversationId = ref<string | null>(null)
  const currentUserId = ref<string | null>(null)
  const userName = ref('Anonymous')
  const userEmail = ref<string>('')
  const isLoading = ref(false)

  let realtimeChannel: RealtimeChannel | null = null

  const logSupabaseError = (scope: string, error: unknown, extra?: Record<string, unknown>) => {
    console.error(`[${scope}]`, {
      error,
      currentUserId: currentUserId.value,
      activeConversationId: activeConversationId.value,
      ...extra,
    })
  }

  const resetState = () => {
    messages.value = []
    conversations.value = []
    users.value = []
    activeConversationId.value = null
    currentUserId.value = null
    userName.value = 'Anonymous'
    userEmail.value = ''
  }

  const resolveAuthUserId = async (): Promise<string | null> => {
    const { supabase } = useSupabase()
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      logSupabaseError('resolveAuthUserId.getUser', error)
      return null
    }

    if (!data.user) {
      console.error('[resolveAuthUserId.noUser]', {
        currentUserId: currentUserId.value,
        activeConversationId: activeConversationId.value,
      })
      return null
    }

    currentUserId.value = data.user.id
    return data.user.id
  }

  const ensureProfile = async () => {
    const { supabase } = useSupabase()
    const authUserId = await resolveAuthUserId()
    if (!authUserId) return

    const { error } = await supabase.from('profiles').upsert(
      {
        id: authUserId,
        display_name: userName.value,
        email: userEmail.value || null,
      },
      { onConflict: 'id' },
    )

    if (error) {
      logSupabaseError('ensureProfile.upsert', error, { authUserId })
    }
  }

  const loadUsers = async () => {
    const { supabase } = useSupabase()
    if (!currentUserId.value) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .neq('id', currentUserId.value)
        .order('display_name', { ascending: true })

      if (error) throw error
      users.value = (data || []) as UserProfile[]
    } catch (error) {
      logSupabaseError('loadUsers', error)
    }
  }

  const loadMessages = async (conversationId?: string) => {
    const { supabase } = useSupabase()
    const targetConversationId = conversationId || activeConversationId.value

    if (!targetConversationId) {
      messages.value = []
      return
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', targetConversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      messages.value = (data || []) as ChatMessage[]
    } catch (error) {
      logSupabaseError('loadMessages', error, { targetConversationId })
    }
  }

  const setActiveConversation = async (conversationId: string | null) => {
    activeConversationId.value = conversationId
    await loadMessages(conversationId || undefined)
  }

  const loadConversations = async () => {
    const { supabase } = useSupabase()
    if (!currentUserId.value) return

    try {
      const { data: memberRows, error: memberError } = await supabase
        .from('conversation_members')
        .select('conversation_id, conversations(id, type, name, pair_key, created_by, created_at)')
        .eq('user_id', currentUserId.value)

      if (memberError) throw memberError

      const conversationRows = ((memberRows || []) as ConversationMemberWithConversationRow[])
        .map(row => toConversationRow(row.conversations))
        .filter((row: ConversationRow | null): row is ConversationRow => Boolean(row))

      if (conversationRows.length === 0) {
        conversations.value = []
        await setActiveConversation(null)
        return
      }

      const usersById = new Map(users.value.map(user => [user.id, user] as const))

      const nextConversations = conversationRows
        .map((conversation) => {
          return {
            ...conversation,
            members: [],
            title: buildConversationTitle(conversation, [], currentUserId.value as string, usersById),
          } satisfies Conversation
        })
        .sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

      conversations.value = nextConversations

      const activeExists = nextConversations.some(conversation => conversation.id === activeConversationId.value)
      if (!activeExists) {
        await setActiveConversation(nextConversations[0]?.id || null)
      }
    } catch (error) {
      logSupabaseError('loadConversations', error)
    }
  }

  const initializeFromSession = async (session: Session | null) => {
    if (!session?.user) {
      console.error('[initializeFromSession.noSession]')
      stopRealtime()
      resetState()
      return
    }

    currentUserId.value = session.user.id

    const metadataName = session.user.user_metadata?.full_name || session.user.user_metadata?.name
    const fallbackName = session.user.email?.split('@')[0]
    userName.value = metadataName || fallbackName || 'Anonymous'
    userEmail.value = session.user.email || ''

    await ensureProfile()
    await loadUsers()
    await loadConversations()
    subscribeToRealtime()
  }

  const createDirectConversation = async (targetUserId: string): Promise<string | null> => {
    const { supabase } = useSupabase()
    const authUserId = await resolveAuthUserId()
    if (!authUserId || !targetUserId || targetUserId === authUserId) return null

    try {
      isLoading.value = true
      const pairKey = getDirectPairKey(authUserId, targetUserId)

      const { data: existingConversation, error: existingConversationError } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'direct')
        .eq('pair_key', pairKey)
        .maybeSingle()

      if (existingConversationError) {
        logSupabaseError('createDirectConversation.findExisting', existingConversationError, { pairKey, authUserId, targetUserId })
        throw existingConversationError
      }

      if (existingConversation?.id) {
        // Repair missing memberships for pre-existing direct conversations.
        const { error: ensureSelfMemberError } = await supabase
          .from('conversation_members')
          .upsert(
            { conversation_id: existingConversation.id, user_id: authUserId },
            { onConflict: 'conversation_id,user_id' },
          )

        if (ensureSelfMemberError) {
          logSupabaseError('createDirectConversation.ensureExistingSelfMember', ensureSelfMemberError, {
            conversationId: existingConversation.id,
            authUserId,
          })
          throw ensureSelfMemberError
        }

        const { error: ensureTargetMemberError } = await supabase
          .from('conversation_members')
          .upsert(
            { conversation_id: existingConversation.id, user_id: targetUserId },
            { onConflict: 'conversation_id,user_id' },
          )

        if (ensureTargetMemberError) {
          logSupabaseError('createDirectConversation.ensureExistingTargetMember', ensureTargetMemberError, {
            conversationId: existingConversation.id,
            targetUserId,
          })
          throw ensureTargetMemberError
        }

        await setActiveConversation(existingConversation.id)
        await loadConversations()
        return existingConversation.id
      }

      const { data: createdConversation, error: createdConversationError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          pair_key: pairKey,
        })
        .select('id')
        .single()

      if (createdConversationError) {
        logSupabaseError('createDirectConversation.insertConversation', createdConversationError, { pairKey, authUserId, targetUserId })
        throw createdConversationError
      }

      const { error: selfMemberError } = await supabase
        .from('conversation_members')
        .upsert(
          { conversation_id: createdConversation.id, user_id: authUserId },
          { onConflict: 'conversation_id,user_id' },
        )

      if (selfMemberError) {
        logSupabaseError('createDirectConversation.insertSelfMember', selfMemberError, { conversationId: createdConversation.id, authUserId })
        throw selfMemberError
      }

      const { error: targetMemberError } = await supabase
        .from('conversation_members')
        .upsert(
          { conversation_id: createdConversation.id, user_id: targetUserId },
          { onConflict: 'conversation_id,user_id' },
        )

      if (targetMemberError) {
        logSupabaseError('createDirectConversation.insertTargetMember', targetMemberError, { conversationId: createdConversation.id, targetUserId })
        throw targetMemberError
      }

      await loadConversations()
      await setActiveConversation(createdConversation.id)
      return createdConversation.id
    } catch (error) {
      logSupabaseError('createDirectConversation', error, { authUserId, targetUserId })
      return null
    } finally {
      isLoading.value = false
    }
  }

  const createGroupConversation = async (name: string, memberIds: string[]): Promise<string | null> => {
    const { supabase } = useSupabase()
    const authUserId = await resolveAuthUserId()
    if (!authUserId) return null

    const trimmedName = name.trim()
    const uniqueMemberIds = [...new Set(memberIds)].filter(id => id !== authUserId)

    if (!trimmedName || uniqueMemberIds.length < 2) {
      return null
    }

    try {
      isLoading.value = true

      const { data: createdConversation, error: createdConversationError } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          name: trimmedName,
        })
        .select('id')
        .single()

      if (createdConversationError) {
        logSupabaseError('createGroupConversation.insertConversation', createdConversationError, {
          authUserId,
          trimmedName,
          uniqueMemberIds,
        })
        throw createdConversationError
      }

      const { error: selfMemberError } = await supabase
        .from('conversation_members')
        .upsert(
          { conversation_id: createdConversation.id, user_id: authUserId },
          { onConflict: 'conversation_id,user_id' },
        )

      if (selfMemberError) {
        logSupabaseError('createGroupConversation.insertSelfMember', selfMemberError, {
          authUserId,
          conversationId: createdConversation.id,
        })
        throw selfMemberError
      }

      const membersPayload = uniqueMemberIds.map(memberId => ({
        conversation_id: createdConversation.id,
        user_id: memberId,
      }))

      const { error: membersError } = await supabase
        .from('conversation_members')
        .upsert(membersPayload, { onConflict: 'conversation_id,user_id' })

      if (membersError) {
        logSupabaseError('createGroupConversation.insertMembers', membersError, {
          conversationId: createdConversation.id,
          uniqueMemberIds,
        })
        throw membersError
      }

      await loadConversations()
      await setActiveConversation(createdConversation.id)
      return createdConversation.id
    } catch (error) {
      logSupabaseError('createGroupConversation', error, { authUserId, trimmedName, uniqueMemberIds })
      return null
    } finally {
      isLoading.value = false
    }
  }

  const addMessage = async (content: string) => {
    const { supabase } = useSupabase()
    const authUserId = await resolveAuthUserId()
    if (!activeConversationId.value || !authUserId || !content.trim()) return

    try {
      isLoading.value = true
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: activeConversationId.value,
          content: content.trim(),
          sender_id: authUserId,
          sender_name: userName.value,
        })

      if (error) {
        logSupabaseError('addMessage.insert', error, { authUserId })
        throw error
      }
    } catch (error) {
      logSupabaseError('addMessage', error)
    } finally {
      isLoading.value = false
    }
  }

  const updateMessage = async (id: string, newContent: string) => {
    const { supabase } = useSupabase()
    const authUserId = await resolveAuthUserId()
    if (!authUserId || !newContent.trim()) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ content: newContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        logSupabaseError('updateMessage.update', error, { authUserId, messageId: id })
        throw error
      }
    } catch (error) {
      logSupabaseError('updateMessage', error, { authUserId, messageId: id })
    }
  }

  const deleteMessage = async (id: string) => {
    const { supabase } = useSupabase()
    const authUserId = await resolveAuthUserId()
    if (!authUserId) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', id)

      if (error) {
        logSupabaseError('deleteMessage.delete', error, { authUserId, messageId: id })
        throw error
      }
    } catch (error) {
      logSupabaseError('deleteMessage', error, { authUserId, messageId: id })
    }
  }

  const clearMessages = async () => {
    const { supabase } = useSupabase()
    const authUserId = await resolveAuthUserId()
    if (!activeConversationId.value || !authUserId) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', activeConversationId.value)

      if (error) {
        logSupabaseError('clearMessages.delete', error, { authUserId })
        throw error
      }
      messages.value = []
    } catch (error) {
      logSupabaseError('clearMessages', error, { authUserId })
    }
  }

  const subscribeToRealtime = () => {
    const { supabase } = useSupabase()
    if (!currentUserId.value) return null

    if (realtimeChannel) {
      realtimeChannel.unsubscribe()
    }

    realtimeChannel = supabase
      .channel(`chat:${currentUserId.value}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async () => {
          await loadConversations()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_members' },
        async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const affectedUserId = payload.new?.user_id || payload.old?.user_id
          const affectedConversationId = payload.new?.conversation_id || payload.old?.conversation_id
          const isCurrentConversation = conversations.value.some(conversation => conversation.id === affectedConversationId)

          if (affectedUserId === currentUserId.value || isCurrentConversation) {
            await loadConversations()
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const incomingMessage = toChatMessage(payload.new)
          if (!incomingMessage) return
          if (incomingMessage.conversation_id !== activeConversationId.value) return

          messages.value.push(incomingMessage)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const updatedMessage = toChatMessage(payload.new)
          if (!updatedMessage) return
          if (updatedMessage.conversation_id !== activeConversationId.value) return

          const index = messages.value.findIndex(message => message.id === updatedMessage.id)
          if (index === -1) return
          messages.value[index] = updatedMessage
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const deletedMessage = toChatMessage(payload.old)
          if (!deletedMessage) return
          if (deletedMessage.conversation_id !== activeConversationId.value) return

          messages.value = messages.value.filter(message => message.id !== deletedMessage.id)
        },
      )
      .subscribe()

    return realtimeChannel
  }

  const stopRealtime = () => {
    if (!realtimeChannel) return
    realtimeChannel.unsubscribe()
    realtimeChannel = null
  }

  return {
    messages,
    conversations,
    users,
    activeConversationId,
    currentUserId,
    userName,
    userEmail,
    isLoading,
    initializeFromSession,
    setActiveConversation,
    loadConversations,
    loadUsers,
    loadMessages,
    createDirectConversation,
    createGroupConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    subscribeToRealtime,
    stopRealtime,
    resetState,
  }
})
