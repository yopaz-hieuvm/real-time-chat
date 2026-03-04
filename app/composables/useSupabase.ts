import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const useSupabase = () => {
  const nuxtApp = useNuxtApp()
  const config = useRuntimeConfig()
  const { supabaseUrl, supabaseAnonKey } = config.public

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase configuration missing:\n' +
      'Make sure NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment or .env and restart the dev server.'
    )
  }

  const appWithSupabase = nuxtApp as typeof nuxtApp & { $supabaseClient?: SupabaseClient }

  if (!appWithSupabase.$supabaseClient) {
    appWithSupabase.$supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return { supabase: appWithSupabase.$supabaseClient }
}
