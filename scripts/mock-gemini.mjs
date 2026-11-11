// Stand-in for the Gemini generateContent endpoint, for wiring tests only.
// NOT used by the app and NOT a mock AI answer in the product: it exists so the
// request/response path can be proven before a real GEMINI_API_KEY is supplied.
import { createServer } from 'node:http'

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  const key = url.searchParams.get('key') || ''
  const modelMatch = url.pathname.match(/\/models\/([^:]+):generateContent/)
  if (!modelMatch) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: { code: 404, message: 'Not found', status: 'NOT_FOUND' } }))
  }
  if (!key) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }))
  }

  let raw = ''
  for await (const c of req) raw += c
  const body = JSON.parse(raw || '{}')
  const userText = (body.contents || []).flatMap((c) => c.parts || []).map((p) => p.text || '').join(' ')
  const wantsJson = body.generationConfig?.responseMimeType === 'application/json'
  console.log('[mock-gemini] model=%s turns=%d json=%s key=%s…', modelMatch[1], body.contents?.length, wantsJson, key.slice(0, 4))

  if (/force-429-day/.test(userText)) {
    res.writeHead(429, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: { code: 429, message: 'Quota exceeded for quota metric "GenerateContent requests per day"', status: 'RESOURCE_EXHAUSTED', details: [{ retryDelay: '30s' }] } }))
  }
  if (/force-500/.test(userText)) {
    res.writeHead(500, { 'Content-Type': 'text/html' })
    return res.end('<html>internal error</html>')
  }
  if (/force-safety/.test(userText)) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] }))
  }

  const text = wantsJson
    ? JSON.stringify({ title: 'Mock Notes', subject: 'DBMS', body: '## Mock\n- one\n- two' })
    : `Mock Gemini reply: ${userText.slice(0, 60)}`

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 30, totalTokenCount: 50 },
  }))
})

server.listen(8890, () => console.log('[mock-gemini] listening on http://127.0.0.1:8890/v1beta'))
