// Vercel Serverless Function: POST /api/ai-notes
// Same contract as netlify/functions/ai-notes.mjs.
import { parseVercelBody, vercelCors, getClientId, checkRateLimit, isConfigured, model, chat, AIError, logCall } from './_lib_adapter.js'

const STYLES = {
  short: 'short, condensed notes: the essentials only, maximum 250 words',
  detailed: 'detailed notes: full explanations, sub-points and one example per concept',
  exam: 'exam-oriented notes: what is most likely to be asked, how to score marks, common mistakes',
  definitions: 'a list of important definitions, one per line, in the form "**Term** — definition"',
  keypoints: 'key points only, as a flat bulleted list of 10–15 items',
  qa: 'a question-and-answer revision set of 8–12 questions with concise answers',
  'quick-revision': 'a one-page quick revision sheet: headings, bold key terms, formulas, memory hooks',
}

export default async function handler(req, res) {
  vercelCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isConfigured()) return res.status(503).json({ error: 'AI is not configured on this deployment (GEMINI_API_KEY missing).', code: 'no_key' })

  const body = parseVercelBody(req)
  if (!body) return res.status(400).json({ error: 'Invalid JSON body' })

  const material = typeof body.material === 'string' ? body.material.trim() : ''
  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  if (!material && !topic) return res.status(400).json({ error: 'Provide study material or a topic.' })
  if (material.length > 90_000) return res.status(413).json({ error: 'That material is too long. Send fewer pages at a time.', code: 'too_long' })

  const limit = checkRateLimit(getClientId(req))
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfter))
    return res.status(429).json({ error: `AI limit reached (${limit.scope}). Try again later.`, code: 'rate_limited' })
  }

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

  const id = getClientId(req)
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
      const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = { title, subject, body: content }
      }
    }

    logCall({ fn: 'ai-notes', ok: true, status: 200, client: id, model: model(), ms: Date.now() - started, promptChars: user.length, completionChars: content.length, tokens: usage?.total_tokens, requestId: null })
    return res.status(200).json({
      title: (parsed.title || title).slice(0, 140),
      subject: (parsed.subject || subject).slice(0, 60),
      style,
      body: typeof parsed.body === 'string' ? parsed.body : content,
      model: model(),
      usage,
      remaining: limit.remaining,
    })
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500
    logCall({ fn: 'ai-notes', ok: false, status, code: e.code, client: id, model: model(), ms: Date.now() - started, promptChars: user.length, err: e.message, requestId: null })
    return res.status(status).json({ error: e.message, code: e.code || 'error' })
  }
}
