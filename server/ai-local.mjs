/**
 * SMART QR PRINT — local AI gateway (no API key needed)
 *
 * Runs a small instruction model ON THIS COMPUTER with node-llama-cpp, so the
 * assistant answers for real with no cloud key and nothing leaving the machine.
 * It speaks the same contract as the cloud gateway and the Supabase function:
 *
 *   GET  /health                 → { ok, providerConfigured, mode, model, ready }
 *   POST /ai-chat { messages, system, temperature } → { content }
 *
 * Quick start:
 *   npm install node-llama-cpp        # one-time, downloads native bindings
 *   npm run ai:local                  # downloads the model on first run, then serves
 *
 * Then point the app at it and rebuild:
 *   VITE_AI_ENDPOINT=http://127.0.0.1:8787/ai-chat
 *   npm run build
 *
 * Model choices (Qwen2.5-Instruct GGUF, Apache-2.0):
 *   tiny   → Qwen2.5-0.5B-Instruct q4_k_m  (~0.5 GB)  fastest, simple answers
 *   small  → Qwen2.5-3B-Instruct   q4_k_m  (~2 GB)    good balance
 *   medium → Qwen2.5-7B-Instruct   q4_k_m  (~4.7 GB)  best quality, needs ~8 GB RAM
 * Set AI_LOCAL_SIZE=tiny|small|medium, or AI_MODEL_FILE to any local .gguf path.
 */

import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PORT = Number(process.env.AI_GATEWAY_PORT || 8787)
const SIZE = process.env.AI_LOCAL_SIZE || 'small'
const ALLOWED_ORIGIN = process.env.AI_ALLOWED_ORIGIN || '*'
const MAX_BODY = 512 * 1024

const MODELS = {
  tiny: { repo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF', file: 'qwen2.5-0.5b-instruct-q4_k_m.gguf', label: 'Qwen2.5-0.5B-Instruct (q4_k_m)' },
  small: { repo: 'Qwen/Qwen2.5-3B-Instruct-GGUF', file: 'qwen2.5-3b-instruct-q4_k_m.gguf', label: 'Qwen2.5-3B-Instruct (q4_k_m)' },
  medium: { repo: 'Qwen/Qwen2.5-7B-Instruct-GGUF', file: 'qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf', label: 'Qwen2.5-7B-Instruct (q4_k_m, split)' },
}

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
}
const send = (res, status, body) => {
  res.writeHead(status, CORS)
  res.end(JSON.stringify(body))
}

const state = { mode: 'local', ready: false, error: null, model: process.env.AI_MODEL_FILE || MODELS[SIZE]?.label, session: null }

async function boot() {
  let llama
  try {
    llama = await import('node-llama-cpp')
  } catch {
    state.error = 'node-llama-cpp is not installed. Run: npm install node-llama-cpp'
    console.error(`[ai-local] ${state.error}`)
    return
  }

  const { getLlama, resolveModelFile, LlamaChatSession } = llama
  const cacheDir = process.env.AI_MODEL_DIR || join(homedir(), '.cache', 'smartqr-models')

  let modelPath = process.env.AI_MODEL_FILE
  if (!modelPath) {
    const m = MODELS[SIZE] || MODELS.small
    state.model = m.label
    if (SIZE === 'medium') {
      state.error =
        'Qwen2.5-7B is split across two GGUF files, which this loader cannot merge. ' +
        'Download a single-file 7B quant (e.g. from a bartowski GGUF repo) and set AI_MODEL_FILE=/path/to/file.gguf, ' +
        'or run with AI_LOCAL_SIZE=small.'
      console.error(`[ai-local] ${state.error}`)
      return
    }
    console.log(`[ai-local] resolving ${m.repo}/${m.file} (first run downloads it)…`)
    try {
      modelPath = await resolveModelFile(`hf:${m.repo}/${m.file}`, { directory: cacheDir })
    } catch (e) {
      state.error = `Could not download the model: ${e.message}`
      console.error(`[ai-local] ${state.error}`)
      return
    }
  } else if (!existsSync(modelPath)) {
    state.error = `AI_MODEL_FILE does not exist: ${modelPath}`
    console.error(`[ai-local] ${state.error}`)
    return
  }

  try {
    const llamaInstance = await getLlama()
    const model = await llamaInstance.loadModel({ modelPath })
    const context = await model.createContext({ contextSize: Number(process.env.AI_CONTEXT || 4096) })
    state.session = new LlamaChatSession({ contextSequence: context.getSequence() })
    state.ready = true
    state.error = null
    console.log(`[ai-local] model ready: ${state.model}`)
  } catch (e) {
    state.error = `Could not load the model: ${e.message}`
    console.error(`[ai-local] ${state.error}`)
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, providerConfigured: state.ready, mode: 'local', model: state.model, ready: state.ready, error: state.error })
  }
  if (req.method !== 'POST' || !req.url.startsWith('/ai-chat')) return send(res, 404, { error: 'Not found' })
  if (!state.ready) return send(res, 503, { error: state.error || 'Local model is still loading. Try again in a moment.' })

  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > MAX_BODY) return send(res, 413, { error: 'Request too large' })
  }
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return send(res, 400, { error: 'Invalid JSON body' })
  }

  const { messages = [], system } = body
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content
  if (!last) return send(res, 400, { error: 'messages[] with a user message is required' })

  // Keep the prompt small: system + the last few turns.
  const history = messages.slice(-6, -1).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
  const prompt = `${history ? history + '\n' : ''}User: ${last}`

  try {
    const answer = await state.session.prompt(prompt, {
      systemPrompt: system || 'You are a helpful study assistant for college students. Answer clearly and concisely.',
      temperature: Math.min(1, Math.max(0, Number(body.temperature) || 0.4)),
      maxTokens: 700,
    })
    return send(res, 200, { content: answer.trim(), mode: 'local', model: state.model })
  } catch (e) {
    console.error('[ai-local] generation failed', e)
    return send(res, 502, { error: `Local generation failed: ${e.message}` })
  }
})

server.listen(PORT, () => {
  console.log(`[ai-local] listening on http://127.0.0.1:${PORT}`)
  boot()
})
