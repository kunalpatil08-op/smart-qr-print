// POST /.netlify/functions/ai-agent
// Body: { question: string, subject?: string, saveAsNote?: boolean, context?: string }
// Returns: { answer, note?: { title, subject, body }, model, usage }
//
// The agent's model step: answers a student's question and, when asked, turns the
// answer into a short study note the app files in the student's library.
// The agent's rule-based monitors (orders, documents, printers) stay local and
// never call this function — this is only for study questions.

import { json, corsHeaders, parseBody, clientId, checkRateLimit, isConfigured, model, chat, AIError, logCall } from './_lib/ai.mjs'

export const handler = async (event) => {
  const cors = corsHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' }, cors)
  if (!isConfigured()) return json(503, { error: 'AI is not configured on this deployment (GEMINI_API_KEY missing).', code: 'no_key' }, cors)

  const body = parseBody(event)
  if (!body) return json(400, { error: 'Invalid JSON body' }, cors)

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) return json(400, { error: 'question is required' }, cors)
  if (question.length > 8000) return json(413, { error: 'That question is too long.', code: 'too_long' }, cors)

  const limit = checkRateLimit(clientId(event))
  if (!limit.ok) return json(429, { error: `AI limit reached (${limit.scope}). Try again later.`, code: 'rate_limited' }, { ...cors, 'Retry-After': String(limit.retryAfter) })

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

  const id = clientId(event)
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

    logCall({ fn: 'ai-agent', ok: true, status: 200, client: id, model: model(), ms: Date.now() - started, promptChars: user.length, completionChars: content.length, tokens: usage?.total_tokens, requestId: event.headers?.['x-nf-request-id'] })
    return json(200, {
      answer: typeof parsed.answer === 'string' ? parsed.answer : content,
      note: saveAsNote && parsed.note?.body
        ? { title: (parsed.note.title || question).slice(0, 140), subject, body: String(parsed.note.body) }
        : null,
      model: model(),
      usage,
      remaining: limit.remaining,
    }, cors)
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500
    logCall({ fn: 'ai-agent', ok: false, status, code: e.code, client: id, model: model(), ms: Date.now() - started, promptChars: user.length, err: e.message, requestId: event.headers?.['x-nf-request-id'] })
    return json(status, { error: e.message, code: e.code || 'error' }, cors)
  }
}
