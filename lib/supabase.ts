// All database access uses the service role key via createServerClient.
// This file re-exports it so legacy/future imports of '@/lib/supabase' still work.
export { createServerClient as createClient } from './supabase-server'
