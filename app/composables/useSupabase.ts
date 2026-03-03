import { createClient } from '@supabase/supabase-js'


// Wrap initialization inside composable so runtime config is accessed at call-time
export const useSupabase = () => {
  const config = useRuntimeConfig()
  const { supabaseUrl, supabaseAnonKey } = config.public

  // debug log
  console.log('[useSupabase] runtime public config', { supabaseUrl, supabaseAnonKey })

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase configuration missing:\n' +
      'Make sure NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment or .env and restart the dev server.'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  return { supabase }
}
