// Shared helpers for the SMART QR PRINT Netlify Functions.
//
// Provider: Google Gemini (free tier). No OpenAI dependency.
//
// Secrets (set in the Netlify UI, never in the repo):
//   GEMINI_API_KEY    required — server-side only
//   AI_MODEL          optional — defaults to gemini-3.1-flash-lite (free tier)
//   AI_HOURLY_LIMIT   optional — requests per client per hour (default 10, free-tier friendly)
//   AI_DAILY_LIMIT    optional — requests per client per day  (default 50)
//   ALLOWED_ORIGIN    optional — comma-separated origins allowed to call these functions
//   GEMINI_BASE_URL   optional — only for wiring tests against a stand-in server
//
// The key is read from process.env at request time and is never returned,
// logged, or included in an error message.

const DEFAULT_MODEL = 'gemini-3.1-flash-lite'
// Older Flash models (2.5-flash, 2.5-pro, flash-latest) now return 404 for new
// keys; the fallback keeps the app working if AI_MODEL is stale.
const FALLBACK_MODELS = (process.env.AI_MODEL_FALLBACKS || 'gemini-3-flash-preview,gemini-2.5-flash-lite').split(',').map((m) => m.trim()).filter(Boolean)
const GEMINI_BASE = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')
const DEFAULT_HOURLY = 10
const DEFAULT_DAILY = 50

export const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  },
  body: JSON.stringify(body),
})

export function corsHeaders(event) {
  const configured = (process.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)
  const origin = event?.headers?.origin || event?.headers?.Origin || ''
  let allow = '*'
  if (configured.length) {
    allow = configured.includes(origin) ? origin : configured[0]
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    Vary: 'Origin',
  }
}

export const isConfigured = () => Boolean(process.env.GEMINI_API_KEY)
export const model = () => activeModel || process.env.AI_MODEL || DEFAULT_MODEL
let activeModel = null
export const provider = () => 'gemini'

/* ------------------------------------------------------------------ log --- */
/**
 * One structured line per AI call. Never logs the key, the URL query string,
 * or the user's full text — only lengths, ids and outcomes.
 */
export function logCall(entry) {
  try {
    const safe = {
      ts: new Date().toISOString(),
      provider: 'gemini',
      fn: entry.fn,
      ok: entry.ok,
      status: entry.status,
      code: entry.code,
      model: entry.model,
      ms: entry.ms,
      client: entry.client ? String(entry.client).slice(0, 12) : undefined,
      promptChars: entry.promptChars,
      completionChars: entry.completionChars,
      tokens: entry.tokens,
      requestId: entry.requestId,
      err: entry.err ? String(entry.err).slice(0, 160) : undefined,
    }
    console.log('[ai]', JSON.stringify(safe))
  } catch {
    console.log('[ai] log failed')
  }
}

/** Strips anything that looks like a secret before a message can reach a client. */
export function redact(text) {
  return String(text || '')
    .replace(/AIza[0-9A-Za-z_\-]{20,}/g, 'AIza***')
    .replace(/sk-[A-Za-z0-9_\-]{8,}/g, 'sk-***')
    .replace(/[?&]key=[^&\s]+/gi, '?key=***')
    .replace(/Bearer\s+[A-Za-z0-9_\-.]{8,}/gi, 'Bearer ***')
    .slice(0, 300)
}

export function parseBody(event) {
  if (!event.body) return {}
  try {
    return JSON.parse(event.body)
  } catch {
    return null
  }
}

/** Identifies the caller for rate limiting. Not authentication — a stable id per client. */
export function clientId(event) {
  const header = event.headers?.['x-client-id'] || event.headers?.['X-Client-Id']
  if (header && /^[\w:-]{6,80}$/.test(header)) return header
  const ip = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for'] || 'anon'
  return String(ip).split(',')[0].trim()
}

/* ------------------------------------------------------------ rate limit -- */
// In-memory per instance, sized for the Gemini free tier so a single student
// cannot exhaust the daily quota for everyone. For a hard global quota use
// Upstash/Redis — the hook is this one function.

const buckets = new Map()

export function checkRateLimit(id) {
  const hourly = Number(process.env.AI_HOURLY_LIMIT || DEFAULT_HOURLY)
  const daily = Number(process.env.AI_DAILY_LIMIT || DEFAULT_DAILY)
  const now = Date.now()
  const dayStart = new Date().setHours(0, 0, 0, 0)

  const b = buckets.get(id) || { hour: [], day: 0, dayKey: dayStart }
  if (b.dayKey !== dayStart) {
    b.dayKey = dayStart
    b.day = 0
  }
  b.hour = b.hour.filter((t) => now - t < 3600_000)

  if (b.day >= daily) {
    buckets.set(id, b)
    return { ok: false, scope: 'daily', limit: daily, retryAfter: Math.ceil((dayStart + 86400_000 - now) / 1000) }
  }
  if (b.hour.length >= hourly) {
    buckets.set(id, b)
    return { ok: false, scope: 'hourly', limit: hourly, retryAfter: 3600 - Math.round((now - b.hour[0]) / 1000) }
  }
  b.hour.push(now)
  b.day += 1
  buckets.set(id, b)
  return { ok: true, remaining: { hour: hourly - b.hour.length, day: daily - b.day } }
}

/* ---------------------------------------------------------------- Gemini -- */

export class AIError extends Error {
  constructor(status, message, code, retryAfter) {
    super(message)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

/** Gemini expects alternating turns; merge consecutive same-role messages. */
function toContents(messages) {
  const out = []
  for (const m of messages) {
    if (!m || typeof m.content !== 'string') continue
    const role = m.role === 'assistant' ? 'model' : 'user'
    const last = out[out.length - 1]
    if (last && last.role === role) last.parts.push({ text: m.content.slice(0, 24000) })
    else out.push({ role, parts: [{ text: m.content.slice(0, 24000) }] })
  }
  // Gemini requires the first turn to be the user's.
  while (out.length && out[0].role !== 'user') out.shift()
  return out.slice(-20)
}

/** Gemini can disable "thinking" on 2.5 Flash — faster and cheaper on the free tier. */
function thinkingConfig() {
  const off = process.env.AI_THINKING !== 'on'
  return off ? { thinkingBudget: 0 } : undefined
}

/**
 * Calls Gemini generateContent and returns the text.
 * Errors are mapped to friendly messages; the key is never echoed.
 */
export async function chat({ messages, system, temperature = 0.4, maxTokens = 1400, responseFormat, __model }) {
  const useModel = __model || model()
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    logCall({ fn: 'gemini', ok: false, status: 503, code: 'no_key', model: model() })
    throw new AIError(503, 'GEMINI_API_KEY is not set on this deployment.', 'no_key')
  }

  const url = `${GEMINI_BASE}/models/${encodeURIComponent(useModel)}:generateContent`
  const payload = {
    contents: toContents(
      messages.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'),
    ),
    generationConfig: {
      temperature: Math.min(2, Math.max(0, Number(temperature) || 0.4)),
      maxOutputTokens: Math.min(8192, Math.max(64, Number(maxTokens) || 1400)),
      ...(responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
      ...(thinkingConfig() ? { thinkingConfig: thinkingConfig() } : {}),
      // Gemini 3 models cannot fully disable thinking; cap it so replies stay fast.
      ...(/^gemini-3/.test(useModel) ? { thinkingConfig: { thinkingLevel: process.env.AI_THINKING_LEVEL || 'low' } } : {}),
    },
    ...(system ? { systemInstruction: { parts: [{ text: String(system).slice(0, 6000) }] } } : {}),
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  }

  if (!payload.contents.length) throw new AIError(400, 'No user message was provided.', 'bad_request')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 55_000)
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    if (e.name === 'AbortError') throw new AIError(504, 'The model took too long to answer. Try a shorter request.', 'timeout')
    throw new AIError(502, 'Could not reach Google Gemini. Check the function’s network access.', 'network')
  }
  clearTimeout(timer)

  // A retired model returns 404 for new keys — move to the next one and remember it.
  if (res.status === 404 && !__model) {
    for (const alt of FALLBACK_MODELS) {
      if (alt === useModel) continue
      logCall({ fn: 'gemini', ok: false, status: 404, code: 'model_gone', model: useModel, err: 'retrying with ' + alt })
      try {
        const r = await chat({ messages, system, temperature, maxTokens, responseFormat, __model: alt })
        activeModel = alt
        return r
      } catch (e) {
        if (e.code !== 'bad_model') throw e
      }
    }
  }

  let data = null
  const raw = await res.text().catch(() => '')
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  if (!res.ok) {
    const providerMessage = data?.error?.message || ''
    const providerStatus = data?.error?.status || ''
    logCall({ fn: 'gemini', ok: false, status: res.status, code: providerStatus || 'http_' + res.status, model: model(), err: redact(raw).slice(0, 140) })

    if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(providerMessage)) {
      throw new AIError(502, 'Google rejected the API key. Re-check GEMINI_API_KEY in Netlify.', 'bad_key')
    }
    if (res.status === 403) {
      throw new AIError(502, 'This Gemini key is not allowed to use the API. Enable the Generative Language API for its project.', 'forbidden')
    }
    if (res.status === 404) {
      throw new AIError(502, `Model "${model()}" is not available on this key. Set AI_MODEL to gemini-3.1-flash-lite.`, 'bad_model')
    }
    if (res.status === 429) {
      const retry = Number((raw.match(/"retryDelay":\s*"(\d+)s"/) || [])[1] || 0)
      const perDay = /per day|PerDay|daily/i.test(raw)
      throw new AIError(
        429,
        perDay
          ? 'The free Gemini quota for today is used up. It resets at midnight Pacific time — or use a different GEMINI_API_KEY.'
          : 'Gemini’s free-tier limit was hit for a moment. Please try again in a few seconds.',
        perDay ? 'quota_day' : 'quota_minute',
        retry || undefined,
      )
    }
    if (res.status >= 500) throw new AIError(502, 'Google Gemini had a server error. Please try again in a moment.', 'provider_error')
    throw new AIError(502, redact(providerMessage) || `Gemini returned ${res.status}.`, 'provider_error')
  }

  const candidate = data?.candidates?.[0]
  const finish = candidate?.finishReason
  const parts = candidate?.content?.parts || []
  const text = parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('').trim()

  if (!text) {
    if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT') {
      logCall({ fn: 'gemini', ok: false, status: 200, code: 'blocked', model: model() })
      throw new AIError(422, 'That question was blocked by the model’s safety filter. Try rephrasing it.', 'blocked')
    }
    if (finish === 'MAX_TOKENS') {
      throw new AIError(502, 'The answer was cut off before it started. Try a shorter question.', 'max_tokens')
    }
    logCall({ fn: 'gemini', ok: false, status: 200, code: 'empty', model: model(), err: redact(JSON.stringify(data?.promptFeedback || {})).slice(0, 120) })
    throw new AIError(502, 'Gemini returned an empty answer.', 'empty')
  }

  return {
    content: text,
    usage: data.usageMetadata
      ? {
          prompt_tokens: data.usageMetadata.promptTokenCount,
          completion_tokens: data.usageMetadata.candidatesTokenCount,
          total_tokens: data.usageMetadata.totalTokenCount,
        }
      : null,
  }
}
