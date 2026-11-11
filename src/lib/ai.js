/**
 * AI client — talks to the Netlify Functions in netlify/functions.
 *
 * The browser only ever knows a URL. GEMINI_API_KEY lives in Netlify's
 * environment variables and is read by the function at request time; it is
 * never in this bundle, never in localStorage, never in a VITE_ variable.
 */

import { readJson, withRequestId } from './http.js'

const RAW_ENDPOINT = import.meta.env.VITE_AI_ENDPOINT || ''

/** Relative endpoints (/.netlify/functions/…) work on the deployed site and in `netlify dev`. */
export const AI_ENDPOINT = RAW_ENDPOINT || (import.meta.env.PROD ? '/.netlify/functions/ai-chat' : '')
export const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'gemini-3.1-flash-lite'
export const isAIConfigured = Boolean(AI_ENDPOINT)

export const NOT_CONFIGURED_MESSAGE =
  'The AI provider is not connected in this environment, so no answer was generated. ' +
  'Nothing is being simulated. Set GEMINI_API_KEY in Netlify (Functions scope) and redeploy.'

/** Diagnostics of the last AI call, shown on the AI provider page. */
export const lastAICall = { url: null, status: null, code: null, requestId: null, at: null, ok: null }

export const HOW_TO_CONNECT =
  'Netlify → Site configuration → Environment variables → GEMINI_API_KEY (scope: Functions), then redeploy. ' +
  'The functions in netlify/functions read it server-side; the app only calls the endpoint URL.'

const CLIENT_ID_KEY = 'smartqr:clientId'

function clientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY)
    if (!id) {
      id = `web_${crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)}`
      localStorage.setItem(CLIENT_ID_KEY, id)
    }
    return id
  } catch {
    return 'web_anon'
  }
}

/** Turn any failure into a message a student can act on. */
function toFriendlyError(status, payload) {
  const code = payload?.code
  const serverMessage = payload?.error
  if (code === 'no_key') return 'AI is not configured on this deployment. Add GEMINI_API_KEY in Netlify and redeploy.'
  if (code === 'bad_key') return 'The Gemini key was rejected. Check GEMINI_API_KEY in Netlify.'
  if (code === 'quota_day') return 'The free Gemini quota for today is used up. It resets at midnight Pacific time.'
  if (code === 'blocked') return 'That question was blocked by the model’s safety filter. Try rephrasing it.'
  if (code === 'forbidden') return 'This Gemini key is not allowed to use the API. Enable the Generative Language API for its project.'
  if (code === 'provider_quota' || status === 429) return serverMessage || 'The AI is busy or over quota. Try again in a moment.'
  if (code === 'too_long' || status === 413) return serverMessage || 'That is too long for one request — try fewer pages.'
  if (code === 'timeout' || status === 504) return 'The model took too long. Try a shorter request.'
  if (code === 'rate_limited') return serverMessage || 'You have reached the AI usage limit for now.'
  if (status === 404) return 'The AI function was not found. Is the site deployed with Netlify Functions?'
  return serverMessage || `AI request failed (${status}).`
}

async function post(path, body) {
  lastAICall.url = path
  lastAICall.at = new Date().toISOString()
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': clientId() },
      body: JSON.stringify(body),
    })
  } catch (e) {
    lastAICall.ok = false
    lastAICall.code = 'network'
    throw Object.assign(new Error(`Could not reach ${path}. Check your connection, or that the site is deployed with Netlify Functions.`), { code: 'network' })
  }

  lastAICall.status = res.status
  // Handles JSON, HTML error pages and empty bodies without losing the reason.
  let parsed
  try {
    parsed = await readJson(res, { what: 'The AI function' })
  } catch (e) {
    lastAICall.ok = false
    lastAICall.code = e.code
    lastAICall.requestId = e.requestId || null
    throw Object.assign(new Error(withRequestId(e.message, e.requestId)), { status: e.status, code: e.code, requestId: e.requestId })
  }

  const data = parsed.data || {}
  lastAICall.requestId = parsed.requestId
  lastAICall.code = data.code || (res.ok ? 'ok' : null)
  lastAICall.ok = res.ok

  if (!res.ok) {
    throw Object.assign(new Error(withRequestId(toFriendlyError(res.status, data), parsed.requestId)), {
      status: res.status,
      code: data.code,
      requestId: parsed.requestId,
    })
  }

  // The contract is { content } for chat, { body } for notes, { answer } for agent.
  if (!('content' in data) && !('body' in data) && !('answer' in data) && !('ok' in data)) {
    throw Object.assign(new Error(`The AI function replied without an answer (HTTP ${res.status}).`), { status: res.status, code: 'shape_mismatch', requestId: parsed.requestId })
  }
  return data
}

const base = (endpoint) => (endpoint || AI_ENDPOINT).replace(/\/ai-chat\/?$/, '')

/** Core chat call used by the Assistant and the PDF assistant. */
export async function requestCompletion({ messages, system, temperature = 0.4, task = 'assistant', endpoint }) {
  if (!isAIConfigured && !endpoint) return { configured: false, reason: 'no_endpoint', message: NOT_CONFIGURED_MESSAGE }
  const data = await post(endpoint || AI_ENDPOINT, { messages, system, temperature, task })
  return { configured: true, content: data.content, usage: data.usage, remaining: data.remaining }
}

/** Structured notes from study material (extracted PDF text, pasted text or a topic). */
export async function generateNotes({ material, topic, subject, style, title }) {
  if (!isAIConfigured) return { configured: false, message: NOT_CONFIGURED_MESSAGE }
  const data = await post(`${base()}/ai-notes`, { material, topic, subject, style, title })
  return { configured: true, ...data }
}

/** The agent's study-question step. */
export async function askAgent({ question, subject, context, saveAsNote = true }) {
  if (!isAIConfigured) return { configured: false, message: NOT_CONFIGURED_MESSAGE }
  const data = await post(`${base()}/ai-agent`, { question, subject, context, saveAsNote })
  return { configured: true, ...data }
}

/** Connection test for the AI provider page. */
export async function checkAIHealth({ ping = true } = {}) {
  if (!isAIConfigured) return { ready: false, error: 'No AI endpoint is configured in this build.' }
  const url = `${base()}/ai-health${ping ? '?ping=1' : ''}`
  try {
    const res = await fetch(url, { headers: { 'X-Client-Id': clientId() } })
    const { data, requestId } = await readJson(res, { what: 'The AI health check' })
    return { ...data, requestId }
  } catch (e) {
    return { ready: false, error: withRequestId(e.message, e.requestId), requestId: e.requestId }
  }
}

export function aiStatus() {
  if (isAIConfigured) return { tone: 'green', label: 'AI connected', detail: `Model: ${AI_MODEL}` }
  return { tone: 'amber', label: 'AI not configured', detail: 'No endpoint set — responses are disabled, not simulated.' }
}

export const AI_PLACEHOLDER = NOT_CONFIGURED_MESSAGE
