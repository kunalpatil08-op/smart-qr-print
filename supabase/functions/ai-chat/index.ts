// SMART QR PRINT — AI chat Edge Function (Supabase / Deno)
//
// Deploy:
//   supabase functions deploy ai-chat --no-verify-jwt=false
//   supabase secrets set OPENAI_API_KEY=sk-...        (or ANTHROPIC_API_KEY=...)
//
// The provider key lives only here. The browser calls this function with the
// user's Supabase JWT; no key ever reaches the client bundle.
//
// Then set in the frontend environment:
//   VITE_AI_ENDPOINT=https://<project>.supabase.co/functions/v1/ai-chat

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ---- 1. Authenticate the caller -------------------------------------
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  // ---- 2. Validate input ----------------------------------------------
  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const { messages, system, temperature = 0.4 } = payload ?? {}
  if (!Array.isArray(messages) || messages.length === 0) return json({ error: 'messages[] required' }, 400)
  if (messages.length > 40) return json({ error: 'Conversation too long' }, 413)
  const clean = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }))

  // ---- 3. Rate limit (per user, per minute) ---------------------------
  // Simple counter table: ai_rate_limit(user_id, window_start, count).
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString()
  const { data: rl } = await supabase.rpc('bump_ai_rate_limit', { p_window: windowStart })
  if (typeof rl === 'number' && rl > 20) return json({ error: 'Rate limit exceeded, try again shortly' }, 429)

  // ---- 4. Call the provider (OpenAI-compatible) ----------------------
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return json({ error: 'AI provider is not configured on the server' }, 503)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini',
      temperature: Math.min(1, Math.max(0, Number(temperature) || 0.4)),
      messages: [
        { role: 'system', content: system ?? 'You are a helpful study assistant for college students.' },
        ...clean,
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('provider error', res.status, text.slice(0, 400))
    return json({ error: `Provider error (${res.status})` }, 502)
  }
  const data = await res.json()
  return json({ content: data.choices?.[0]?.message?.content ?? '' })
})
