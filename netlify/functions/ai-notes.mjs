// POST /.netlify/functions/ai-notes
// Body: { material: string, topic?: string, subject?: string, style?: string, title?: string }
// Returns: { title, subject, body, model, usage }
//
// Turns study material (extracted PDF text, pasted text, or a topic) into
// structured notes. The PDF text is extracted in the browser and sent here —
// this function never sees a file, only text, and it only uses what it is given.

import { json, corsHeaders, parseBody, clientId, checkRateLimit, isConfigured, model, chat, AIError, logCall } from './_lib/ai.mjs'

const STYLES = {
  short: 'short, condensed notes: the essentials only, maximum 250 words',
  detailed: 'detailed notes: full explanations, sub-points and one example per concept',
  exam: 'exam-oriented notes: what is most likely to be asked, how to score marks, common mistakes',
  definitions: 'a list of important definitions, one per line, in the form "**Term** — definition"',
  keypoints: 'key points only, as a flat bulleted list of 10–15 items',
  qa: 'a question-and-answer revision set of 8–12 questions with concise answers',
  'quick-revision': 'a one-page quick revision sheet: headings, bold key terms, formulas, memory hooks',
}

export const handler = async (event) => {
  const cors = corsHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' }, cors)
  if (!isConfigured()) return json(503, { error: 'AI is not configured on this deployment (GEMINI_API_KEY missing).', code: 'no_key' }, cors)

  const body = parseBody(event)
  if (!body) return json(400, { error: 'Invalid JSON body' }, cors)

  const material = typeof body.material === 'string' ? body.material.trim() : ''
  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  if (!material && !topic) return json(400, { error: 'Provide study material or a topic.' }, cors)
  if (material.length > 90_000) return json(413, { error: 'That material is too long. Send fewer pages at a time.', code: 'too_long' }, cors)

  const limit = checkRateLimit(clientId(event))
  if (!limit.ok) return json(429, { error: `AI limit reached (${limit.scope}). Try again later.`, code: 'rate_limited' }, { ...cors, 'Retry-After': String(limit.retryAfter) })

  const style = STYLES[body.style] ? body.style : 'short'
  const subject = (body.subject || 'General').slice(0, 60)
  const title = (body.title || topic || 'Study notes').slice(0, 120)

  const system =
    'You are a study-notes generator for college students. Return strict JSON only, with the shape ' +
    '{"title": string, "subject": string, "body": string}. The body is markdown using ## headings, ' +
    'short bullet points and **bold** key terms. Only use the supplied material; never add facts that are not ' +
    'in it or in the topic. These are study aids, not guaranteed examination questions.'

  const user = [
    `Subject: ${subject}`,
    `Requested format: ${STYLES[style]}`,
    topic ? `Topic: ${topic}` : null,
    material ? `Source material (may be partial, extracted from a PDF):\n"""\n${material}\n"""` : null,
    'Write the notes now.',
  ].filter(Boolean).join('\n\n')

  const id = clientId(event)
  const started = Date.now()

  try {
    const { content, usage } = await chat({
      messages: [{ role: 'user', content: user }],
      system,
      temperature: 0.3,
      maxTokens: 2600,
      responseFormat: 'json',
    })

    let parsed = null
    try {
      parsed = JSON.parse(content)
    } catch {
      // Model wrapped it in prose or code fences — fall back to plain body.
      const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = { title, subject, body: content }
      }
    }

    logCall({ fn: 'ai-notes', ok: true, status: 200, client: id, model: model(), ms: Date.now() - started, promptChars: user.length, completionChars: content.length, tokens: usage?.total_tokens, requestId: event.headers?.['x-nf-request-id'] })
    return json(200, {
      title: (parsed.title || title).slice(0, 140),
      subject: (parsed.subject || subject).slice(0, 60),
      style,
      body: typeof parsed.body === 'string' ? parsed.body : content,
      model: model(),
      usage,
      remaining: limit.remaining,
    }, cors)
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500
    logCall({ fn: 'ai-notes', ok: false, status, code: e.code, client: id, model: model(), ms: Date.now() - started, promptChars: user.length, err: e.message, requestId: event.headers?.['x-nf-request-id'] })
    return json(status, { error: e.message, code: e.code || 'error' }, cors)
  }
}
