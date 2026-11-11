// POST /.netlify/functions/ai-health  (also answers GET)
//
// Tells the app whether the deployment is ready, without ever revealing the key.
// Optionally pings OpenAI with a 1-token request when ?ping=1 is passed.

import { json, corsHeaders, isConfigured, model, provider, chat, AIError } from './_lib/ai.mjs'

export const handler = async (event) => {
  const cors = corsHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }

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
    return json(200, { ...base, ready: false, error: 'GEMINI_API_KEY is not set in Netlify environment variables.' }, cors)
  }

  const ping = event.queryStringParameters?.ping === '1'
  if (!ping) return json(200, { ...base, ready: true, error: null }, cors)

  try {
    const started = Date.now()
    const r = await chat({
      system: 'Answer with one word.',
      messages: [{ role: 'user', content: 'Say: ready' }],
      temperature: 0,
      maxTokens: 8,
    })
    return json(200, { ...base, ready: true, error: null, sample: r.content, latencyMs: Date.now() - started }, cors)
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500
    void status
    return json(200, { ...base, ready: false, error: e.message, code: e.code || 'unknown' }, cors)
  }
}
