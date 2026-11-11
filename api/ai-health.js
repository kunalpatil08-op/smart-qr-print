// Vercel Serverless Function: GET|POST /api/ai-health
// Same contract as netlify/functions/ai-health.mjs — reports readiness without
// ever revealing the key. ?ping=1 makes a 1-token Gemini call.
import { vercelCors, isConfigured, model, provider, chat, AIError } from './_lib_adapter.js'

export default async function handler(req, res) {
  vercelCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const configured = isConfigured()
  const base = {
    ok: true,
    provider: provider(),
    providerConfigured: configured,
    model: model(),
    limits: {
      hourly: Number(process.env.AI_HOURLY_LIMIT || 40),
      daily: Number(process.env.AI_DAILY_LIMIT || 200),
    },
  }

  if (!configured) {
    return res.status(200).json({ ...base, ready: false, error: 'GEMINI_API_KEY is not set in the Vercel environment variables.' })
  }

  const ping = req.query?.ping === '1'
  if (!ping) return res.status(200).json({ ...base, ready: true, error: null })

  try {
    const started = Date.now()
    const r = await chat({
      system: 'Answer with one word.',
      messages: [{ role: 'user', content: 'Say: ready' }],
      temperature: 0,
      maxTokens: 8,
    })
    return res.status(200).json({ ...base, ready: true, error: null, sample: r.content, latencyMs: Date.now() - started })
  } catch (e) {
    void (e instanceof AIError)
    return res.status(200).json({ ...base, ready: false, error: e.message, code: e.code || 'unknown' })
  }
}
