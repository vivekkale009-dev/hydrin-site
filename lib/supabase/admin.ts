import { createClient } from '@supabase/supabase-js'

export const createAdminClient = () => {
  // Use the SERVICE_ROLE_KEY which bypasses RLS
  // NEVER use this on the client-side (browser)
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Ensure this is in your .env
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}