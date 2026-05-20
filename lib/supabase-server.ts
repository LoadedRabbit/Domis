import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set')
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
  // Strip any accidentally-included path suffix (e.g. user copied /rest/v1 from Supabase docs)
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
  return createClient(supabaseUrl, supabaseServiceKey)
}
