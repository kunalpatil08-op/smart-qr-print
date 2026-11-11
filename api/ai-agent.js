// Vercel Serverless Function: POST /api/ai-agent
// Same contract as netlify/functions/ai-agent.mjs.
import { parseVercelBody, vercelCors, getClientId, checkRateLimit, isConfigured, model, chat, AIError, logCall } from './_lib_adapter.js'

export default async function handler(req, res) {
  vercelCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isConfigured()) return res.status(503).json({ error: 'AI is not configured on this deployment (GEMINI_API_KEY missing).', code: 'no_key' })

  const body = parseVercelBody(req)
  if (!body) return res.status(400).json({ error: 'Invalid JSON body' })

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) return res.status(400).json({ error: 'question is required' })
  if (question.length > 8000) return res.status(413).json({ error: 'That question is too long.', code: 'too_long' })

  const limit = checkRateLimit(getClientId(req))
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfter))
    return res.status(429).json({ error: `AI limit reached (${limit.scope}). Try again later.`, code: 'rate_limited' })
  }

  const subject = (body.subject || 'General').slice(0, 60)
  const saveAsNote = body.saveAsNote !== false

  const system =
    'You are SMART AI AGENT, a study assistant for college students. Answer the student’s question directly and concisely ' +
    'with steps or an example. Return strict JSON only: {"answer": string, "note": {"title": string, "body": string}}. ' +
    'The note is a compact study note (## headings, bullets, bold key terms) capturing the answer for later revision. ' +
    'If the question is not academic, still answer briefly and keep the note short.'

  const user = [
    `Subject: ${subject}`,
    body.context ? `Context the student shared:\n"""\n${String(body.context).slice(0, 20000)}\n"""` : null,
    `Question: ${question}`,
    'Answer now.',
  ].filter(Boolean).join('\n\n')

  const id = getClientId(req)
  const started = Date.now()

  try {
    const { content, usage } = await chat({
      messages: [{ role: 'user', content: user }],
      system,
      temperature: 0.35,
      maxTokens: 1800,
      responseFormat: 'json',
    })

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = { answer: content, note: null }
      }
    }

    logCall({ fn: 'ai-agent', ok: true, status: 200, client: id, model: model(), ms: Date.now() - started, promptChars: user.length, completionChars: content.length, tokens: usage?.total_tokens, requestId: null })
    return res.status(200).json({
      answer: typeof parsed.answer === 'string' ? parsed.answer : content,
      note: saveAsNote && parsed.note?.body
        ? { title: (parsed.note.title || question).slice(0, 140), subject, body: String(parsed.note.body) }
        : null,
      model: model(),
      usage,
      remaining: limit.remaining,
    })
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500
    logCall({ fn: 'ai-agent', ok: false, status, code: e.code, client: id, model: model(), ms: Date.now() - started, promptChars: user.length, err: e.message, requestId: null })
    return res.status(status).json({ error: e.message, code: e.code || 'error' })
  }
}
