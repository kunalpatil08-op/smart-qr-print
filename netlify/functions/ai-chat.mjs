// POST /.netlify/functions/ai-chat
// Body: { messages: [{role, content}], system?, temperature?, task? }
// Returns: { content, model, usage, remaining }
//
// This is the single endpoint the AI Assistant, AI Notes, the PDF assistant and
// the AI Agent all call. The OpenAI key lives only in this function.

import { json, corsHeaders, parseBody, clientId, checkRateLimit, isConfigured, model, provider, chat, AIError, logCall } from './_lib/ai.mjs'

const SYSTEMS = {
  assistant:
    'You are Smart AI Assistant inside SMART QR PRINT, a study platform for college students. ' +
    'Explain clearly and concisely, use short paragraphs and numbered steps, give an example, and finish with a one-line exam tip when it helps. ' +
    'If you are unsure, say so. Never invent citations.',
  notes:
    'You are a study-notes generator. Produce well-structured notes with headings, short bullet points and key terms in bold. ' +
    'Only use the material given; if it does not contain enough information, say which parts are missing. ' +
    'These are study aids, not guaranteed examination questions.',
  proofread:
    'You are a careful academic copy-editor. Fix grammar, spelling and clarity while preserving the author’s meaning and terminology.',
  agent:
    'You are SMART AI AGENT inside SMART QR PRINT. You answer a student’s question and, when asked, turn it into a short study note. ' +
    'Be concrete and brief; prefer bullet points and a worked example.',
  buddy:
    'You are PrintBuddy, the small helper inside SMART QR PRINT — a campus printing service. ' +
    'You help people finish a print order: choosing a shop, uploading a PDF, colour or black & white, single or double sided, copies, pages, paper size, ' +
    'how the price is worked out, paying, tracking the order and collecting the printout. ' +
    'Rules: answer in 1–4 short sentences, plain language, friendly and practical. Use the CONTEXT block for real prices and shop names; never invent a price, ' +
    'shop, order or payment. If asked something unrelated to printing or study, give one short helpful sentence and steer back to printing. ' +
    'Never claim a payment succeeded or a job printed. If the context says payments are demo-only, say so plainly.',
}

export const handler = async (event) => {
  const cors = corsHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' }, cors)

  if (!isConfigured()) {
    return json(503, { error: 'AI is not configured on this deployment (GEMINI_API_KEY missing).', code: 'no_key' }, cors)
  }

  const body = parseBody(event)
  if (!body) return json(400, { error: 'Invalid JSON body' }, cors)

  const { messages, system, temperature, task } = body
  if (!Array.isArray(messages) || messages.length === 0) return json(400, { error: 'messages[] is required' }, cors)
  if (messages.length > 40) return json(413, { error: 'Conversation is too long. Start a new conversation.' }, cors)

  const totalChars = messages.reduce((n, m) => n + (typeof m?.content === 'string' ? m.content.length : 0), 0)
  if (totalChars > 120_000) return json(413, { error: 'This request is too large. Send fewer pages or a shorter excerpt.', code: 'too_long' }, cors)

  const limit = checkRateLimit(clientId(event))
  if (!limit.ok) {
    const wait = limit.scope === 'hourly' ? `${Math.ceil(limit.retryAfter / 60)} minutes` : 'until tomorrow'
    return json(
      429,
      { error: `You have reached the ${limit.scope} AI limit (${limit.limit}). Try again in ${wait}.`, code: 'rate_limited', scope: limit.scope },
      { ...cors, 'Retry-After': String(limit.retryAfter) },
    )
  }

  const chosenSystem = typeof system === 'string' && system.trim() ? system : SYSTEMS[task] || SYSTEMS.assistant
  const id = clientId(event)
  const started = Date.now()

  try {
    const maxTokens = task === 'notes' ? 2200 : task === 'buddy' ? 320 : 1400
    const { content, usage } = await chat({ messages, system: chosenSystem, temperature, maxTokens })
    logCall({ fn: 'ai-chat', ok: true, status: 200, client: id, model: model(), ms: Date.now() - started, promptChars: totalChars, completionChars: content.length, tokens: usage?.total_tokens, requestId: event.headers?.['x-nf-request-id'] })
    return json(200, { content, model: model(), provider: provider(), usage, remaining: limit.remaining }, cors)
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500
    logCall({ fn: 'ai-chat', ok: false, status, code: e.code, client: id, model: model(), ms: Date.now() - started, promptChars: totalChars, err: e.message, requestId: event.headers?.['x-nf-request-id'] })
    // Never surface the provider payload verbatim; the message is already sanitised.
    return json(status, { error: e.message, code: e.code || 'error' }, cors)
  }
}
