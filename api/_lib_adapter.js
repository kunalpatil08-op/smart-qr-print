// Vercel adapter for the shared AI helpers.
//
// The Netlify functions in ../netlify/functions/_lib/ai.mjs are the single
// implementation of key handling, the Gemini call, error mapping and rate
// limiting. This file only bridges Vercel's (req, res) signature to them, so
// there is one copy of the logic and no drift between the two hosts.

export {
  isConfigured,
  model,
  provider,
  chat,
  AIError,
  logCall,
  checkRateLimit,
  redact,
} from '../netlify/functions/_lib/ai.mjs'

/** Parses the JSON body Vercel may hand over as an object or a string. */
export function parseVercelBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'object') return req.body
  try {
    return JSON.parse(req.body)
  } catch {
    return null
  }
}

/** Applies CORS headers from ALLOWED_ORIGIN (comma-separated) to a Vercel response. */
export function vercelCors(req, res) {
  const configured = (process.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)
  const origin = req.headers?.origin || ''
  const allow = configured.length ? (configured.includes(origin) ? origin : configured[0]) : '*'
  res.setHeader('Access-Control-Allow-Origin', allow)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Id')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  res.setHeader('Cache-Control', 'no-store')
}

/** Stable per-client id for rate limiting (same rules as the Netlify functions). */
export function getClientId(req) {
  const header = req.headers?.['x-client-id'] || req.headers?.['X-Client-Id']
  if (header && /^[\w:-]{6,80}$/.test(header)) return header
  const ip = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'anon'
  return String(ip).split(',')[0].trim()
}
