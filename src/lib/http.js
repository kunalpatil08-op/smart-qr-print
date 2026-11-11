/**
 * Robust response parsing.
 *
 * The old code called `res.json()` on every reply. When a function (or the host
 * in front of it) answered with HTML — a 404 page, a 502 gateway page, a
 * redirect to a login — that threw "not JSON" and the real cause was lost.
 *
 * `readJson` reads the body as text first, so it can:
 *   - name the actual problem (wrong URL, not deployed, gateway error)
 *   - keep the HTTP status and the request id for support
 *   - still parse JSON with a clear error if the body really is malformed
 */

export async function readJson(res, { what = 'AI function' } = {}) {
  const requestId = res.headers?.get?.('x-nf-request-id') || res.headers?.get?.('x-request-id') || null
  const contentType = res.headers?.get?.('content-type') || ''
  let text = ''
  try {
    text = await res.text()
  } catch {
    text = ''
  }

  const looksJson = contentType.includes('application/json') || /^\s*[{[]/.test(text)
  if (looksJson) {
    try {
      return { data: text ? JSON.parse(text) : {}, status: res.status, requestId, contentType }
    } catch {
      throw Object.assign(
        new Error(`${what} sent malformed JSON (HTTP ${res.status}). ${snippet(text)}`),
        { status: res.status, requestId, code: 'malformed_json' },
      )
    }
  }

  // Non-JSON body: describe what actually came back.
  const isHtml = contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)
  let message
  if (res.status === 404) {
    message = `${what} was not found (HTTP 404). The site is probably deployed without Netlify Functions, or the function name changed.`
  } else if (res.status === 502 || res.status === 504) {
    message = `The function crashed or timed out (HTTP ${res.status}). Check the Netlify function log for this request id.`
  } else if (isHtml) {
    message = `${what} returned an HTML page instead of JSON (HTTP ${res.status}) — usually a redirect or a host error page, not the function.`
  } else {
    message = `${what} returned ${contentType || 'an unknown content type'} (HTTP ${res.status}). ${snippet(text)}`
  }
  throw Object.assign(new Error(message), { status: res.status, requestId, code: 'non_json', bodySnippet: snippet(text) })
}

const snippet = (t) => (t ? `“${String(t).replace(/\s+/g, ' ').slice(0, 120)}”` : 'Empty body.')

/** Adds the request id to an error message so a support question is answerable. */
export function withRequestId(message, requestId) {
  return requestId ? `${message} (request ${requestId})` : message
}
