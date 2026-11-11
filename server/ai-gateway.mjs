/**
 * SMART QR PRINT — local AI gateway (optional, development)
 *
 * A tiny Node server that holds the provider key server-side and exposes one
 * route the web app can call. This is the "server" half of the AI integration,
 * running on your own machine while you test:
 *
 *   AI_API_KEY=sk-...  AI_BASE_URL=https://api.openai.com/v1  AI_MODEL=gpt-4o-mini \
 *     node server/ai-gateway.mjs
 *
 * Then build the app with the endpoint pointing at it:
 *
 *   VITE_AI_ENDPOINT=http://127.0.0.1:8787/ai-chat  npm run build
 *
 * For production use `supabase/functions/ai-chat/index.ts` instead — same
 * request/response contract, with the user's Supabase JWT in front of it.
 *
 * Contract: POST /ai-chat { messages: [{role, content}], system?, temperature? }
 *           → 200 { content: "..." } | 4xx/5xx { error: "..." }
 * The key is read from the environment and never sent to the browser.
 */

import { createServer } from 'node:http'

const PORT = Number(process.env.AI_GATEWAY_PORT || 8787)
const API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || ''
const BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini'
const ALLOWED_ORIGIN = process.env.AI_ALLOWED_ORIGIN || '*'
const MAX_BODY = 512 * 1024

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
}

const send = (res, status, body) => {
  res.writeHead(status, CORS)
  res.end(JSON.stringify(body))
}

// simple per-IP rate limit: 30 requests / minute
const hits = new Map()
const rateLimited = (ip) => {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000)
  list.push(now)
  hits.set(ip, list)
  return list.length > 30
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, providerConfigured: Boolean(API_KEY), model: MODEL, baseUrl: BASE_URL })
  }
  if (req.method !== 'POST' || !req.url.startsWith('/ai-chat')) return send(res, 404, { error: 'Not found' })

  if (!API_KEY) {
    return send(res, 503, {
      error: 'AI provider is not configured on this server. Start the gateway with AI_API_KEY set.',
    })
  }

  const ip = req.socket.remoteAddress || 'unknown'
  if (rateLimited(ip)) return send(res, 429, { error: 'Rate limit exceeded — try again in a minute.' })

  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > MAX_BODY) return send(res, 413, { error: 'Request too large' })
  }

  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return send(res, 400, { error: 'Invalid JSON body' })
  }

  const { messages, system, temperature = 0.4 } = body || {}
  if (!Array.isArray(messages) || messages.length === 0) return send(res, 400, { error: 'messages[] required' })

  const clean = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }))

  try {
    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: Math.min(1, Math.max(0, Number(temperature) || 0.4)),
        messages: [
          { role: 'system', content: typeof system === 'string' && system ? system : 'You are a helpful study assistant for college students.' },
          ...clean,
        ],
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      console.error('[ai-gateway] provider error', upstream.status, text.slice(0, 300))
      return send(res, 502, { error: `Provider error (${upstream.status}). Check the key and model name.` })
    }
    const data = await upstream.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    if (!content) return send(res, 502, { error: 'Provider returned an empty answer.' })
    return send(res, 200, { content })
  } catch (e) {
    console.error('[ai-gateway] request failed', e)
    return send(res, 502, { error: `Could not reach the provider: ${e.message}` })
  }
})

server.listen(PORT, () => {
  console.log(`[ai-gateway] listening on http://127.0.0.1:${PORT}`)
  console.log(`[ai-gateway] provider ${API_KEY ? 'configured' : 'NOT configured'} · model ${MODEL} · ${BASE_URL}`)
})
