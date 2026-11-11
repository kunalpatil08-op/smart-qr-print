/**
 * Production adapter (not active in this build).
 *
 * This file documents exactly how to switch the app from local persistence to
 * Supabase. Nothing here runs unless the two environment variables are set AND
 * `src/lib/db.js` is pointed at these functions.
 *
 * 1. npm i @supabase/supabase-js
 * 2. Create a Supabase project, run supabase/schema.sql in the SQL editor.
 * 3. .env.local:
 *      VITE_SUPABASE_URL=https://<project>.supabase.co
 *      VITE_SUPABASE_ANON_KEY=<anon key>
 * 4. Deploy the edge function in supabase/functions/ai-chat/index.ts with:
 *      supabase secrets set OPENAI_API_KEY=...  (or ANTHROPIC_API_KEY)
 *    The key lives only in the edge function — never in the client bundle.
 */

export const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/*
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

// --- Auth ---------------------------------------------------------------
// export const signUp   = (email, password, meta) => supabase.auth.signUp({ email, password, options: { data: meta } })
// export const signIn   = (email, password) => supabase.auth.signInWithPassword({ email, password })
// export const signOut  = () => supabase.auth.signOut()
// export const resetPw  = (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/forgot-password` })

// --- Storage ------------------------------------------------------------
// export const uploadDocument = async (file, userId) => {
//   const path = `${userId}/${crypto.randomUUID()}-${file.name}`
//   const { error } = await supabase.storage.from('documents').upload(path, file)
//   if (error) throw error
//   return path
// }
// Retention: a pg_cron job calls purge_expired_documents() daily (see schema.sql).

// --- Orders -------------------------------------------------------------
// create_order() is a SECURITY DEFINER RPC: it recomputes the price on the
// server from shops.pricing, so a client can never set its own total.
// export const createOrder = (payload) => supabase.rpc('create_order', payload)
// export const advanceOrder = (id, status) => supabase.rpc('advance_order', { p_order: id, p_status: status })

// --- AI -----------------------------------------------------------------
// export const chat = async (messages) => {
//   const { data, error } = await supabase.functions.invoke('ai-chat', { body: { messages } })
//   if (error) throw error
//   return data
// }
*/
