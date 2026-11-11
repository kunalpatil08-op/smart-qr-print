import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bot, Plug, PlugZap, CheckCircle2, AlertTriangle, Loader2, Terminal, Copy,
  ExternalLink, KeyRound, Server, RefreshCw, ShieldCheck, ChevronDown, Wrench,
} from 'lucide-react'
import { Badge, Button, Card, IntegrationNote, SegmentedControl } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { AI_ENDPOINT, AI_MODEL, HOW_TO_CONNECT, isAIConfigured, checkAIHealth, lastAICall } from '../../lib/ai.js'

// The deployment runs Google Gemini on the free tier. The others are kept as
// reference rows but are not wired to a function in this build.
const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', env: 'GEMINI_API_KEY', model: 'gemini-3.1-flash-lite', url: 'https://generativelanguage.googleapis.com/v1beta', key: 'AIza…', docs: 'https://aistudio.google.com/app/apikey', active: true },
  { id: 'openai', name: 'OpenAI', env: 'OPENAI_API_KEY', model: 'gpt-4o-mini', url: 'https://api.openai.com/v1', key: 'sk-…', docs: 'https://platform.openai.com/api-keys', active: false },
  { id: 'anthropic', name: 'Anthropic', env: 'ANTHROPIC_API_KEY', model: 'claude-sonnet-5-5', url: 'https://api.anthropic.com/v1', key: 'sk-ant-…', docs: 'https://console.anthropic.com/settings/keys', active: false },
  { id: 'groq', name: 'Groq', env: 'GROQ_API_KEY', model: 'llama-3.3-70b', url: 'https://api.groq.com/openai/v1', key: 'gsk_…', docs: 'https://console.groq.com/keys', active: false },
  { id: 'openrouter', name: 'OpenRouter', env: 'OPENROUTER_API_KEY', model: 'openai/gpt-4o-mini', url: 'https://openrouter.ai/api/v1', key: 'sk-or-…', docs: 'https://openrouter.ai/keys', active: false },
  { id: 'hf', name: 'Hugging Face', env: 'HF_TOKEN', model: 'meta-llama/Llama-3.3-70B-Instruct', url: 'https://router.huggingface.co/v1', key: 'hf_…', docs: 'https://huggingface.co/settings/tokens', active: false },
]

export default function AiSettings() {
  const toast = useToast()
  const [provider, setProvider] = useState('gemini')
  const [tab, setTab] = useState('vercel')
  const [testing, setTesting] = useState(false)
  const [health, setHealth] = useState(null) // null | {ok, providerConfigured, model, error}

  const p = PROVIDERS.find((x) => x.id === provider)

  const endpointHint = useMemo(() => (isAIConfigured ? AI_ENDPOINT : '/api/ai-chat'), [])

  const cmd = `# Vercel -> Project -> Settings -> Environment Variables -> Add New
#   Key:   GEMINI_API_KEY
#   Value: ${p.key}
#   Environments: Production, Preview, Development
# then: Deployments -> ... -> Redeploy`

  const checkHealth = async () => {
    setTesting(true)
    setHealth(null)
    // 1. is an endpoint even configured?
    if (!isAIConfigured) {
      setTesting(false)
      setHealth({ ok: false, error: 'This build has no AI endpoint. VITE_AI_ENDPOINT was empty at build time.' })
      return
    }
    // 2. ask the deployed function whether the key is present and working
    const j = await checkAIHealth({ ping: true })
    setHealth({
      ok: Boolean(j.ready),
      providerConfigured: j.providerConfigured,
      model: j.model,
      sample: j.sample,
      latencyMs: j.latencyMs,
      error: j.error || null,
    })
    setTesting(false)
  }

  useEffect(() => { checkHealth() }, [])

  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast('Copied.', 'success')).catch(() => toast('Clipboard unavailable.', 'warning'))

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">AI provider</h1>
          <p className="mt-1 text-[12.5px] text-ink-400">Connect the assistant and notes generator to a real model. The key stays on the server.</p>
        </div>
        <Button size="md" onClick={checkHealth} loading={testing}><RefreshCw size={14} /> Test connection</Button>
      </div>

      {/* status */}
      <Card className={`p-4 ${health?.ok ? 'border-emerald-400/30' : 'border-amber-400/25'}`}>
        <div className="flex items-start gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${health?.ok ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25' : 'bg-amber-400/10 text-amber-300 ring-amber-400/25'}`}>
            {testing ? <Loader2 size={16} className="animate-spin" /> : health?.ok ? <PlugZap size={16} /> : <Plug size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white">
              {testing ? 'Checking…' : health?.ok ? 'AI is connected' : 'AI is not connected'}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">
              {testing
                ? 'Contacting the configured endpoint.'
                : health?.ok
                  ? `Endpoint responded · model ${health.model || AI_MODEL}${health.sample ? ` · sample: “${health.sample}”` : ''}`
                  : health?.error || 'No endpoint configured.'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10.5px] text-ink-500">
              <span className="rounded bg-white/6 px-1.5 py-0.5">endpoint: {isAIConfigured ? AI_ENDPOINT : 'not set'}</span>
              <span className="rounded bg-white/6 px-1.5 py-0.5">model: {health?.model || AI_MODEL}</span>
              <span className="rounded bg-white/6 px-1.5 py-0.5">key: server-side only</span>
              {health?.latencyMs ? <span className="rounded bg-white/6 px-1.5 py-0.5">{health.latencyMs} ms</span> : null}
              {health?.requestId && <span className="rounded bg-white/6 px-1.5 py-0.5">request: {health.requestId}</span>}
            </div>
            {lastAICall.at && (
              <div className="mt-2 rounded-lg border border-white/8 bg-navy-950/40 px-2.5 py-1.5 text-[10.5px] text-ink-500">
                <span className="text-ink-400">Last call</span> · {lastAICall.url} · HTTP {lastAICall.status} · {lastAICall.code}
                {lastAICall.requestId ? ` · ${lastAICall.requestId}` : ''}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white"><KeyRound size={14} className="text-electric-300" /> Pick your provider</h2>
            <SegmentedControl options={[{ value: 'vercel', label: 'Vercel' }, { value: 'local', label: 'Local dev' }]} value={tab} onChange={setTab} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PROVIDERS.map((pr) => (
              <button key={pr.id} onClick={() => setProvider(pr.id)} className={`rounded-xl border p-2.5 text-left transition-colors ${provider === pr.id ? 'border-electric-400/50 bg-electric-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}>
                <p className="text-[12px] font-semibold text-white">{pr.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-ink-500">{pr.model}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/8 bg-navy-950/60 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              <Terminal size={11} /> {tab === 'vercel' ? 'Step 1 · add the secret in Vercel' : 'Step 1 · local gateway with the same key'}
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-black/40 p-2.5 font-mono text-[10.5px] leading-relaxed text-emerald-200">
{tab === 'vercel' ? cmd : `GEMINI_API_KEY=${p.key} AI_MODEL=${p.model} node server/ai-gateway.mjs`}
            </pre>
            <button onClick={() => copy(tab === 'vercel' ? 'GEMINI_API_KEY' : `GEMINI_API_KEY=${p.key}`)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-electric-300 hover:text-electric-200"><Copy size={11} /> Copy</button>
            <a href={p.docs} target="_blank" rel="noreferrer" className="ml-3 inline-flex items-center gap-1 text-[11px] font-medium text-ink-400 hover:text-white">Get a key <ExternalLink size={10} /></a>
          </div>

          <div className="mt-3 rounded-xl border border-white/8 bg-navy-950/60 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500"><Server size={11} /> Step 2 · point the app at it</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-black/40 p-2.5 font-mono text-[10.5px] leading-relaxed text-electric-200">
{`# vercel.json (already set in this project)
VITE_AI_ENDPOINT=${endpointHint}
VITE_AI_MODEL=${p.model}

npm run build`}
            </pre>
            <button onClick={() => copy(`VITE_AI_ENDPOINT=${endpointHint}\nVITE_AI_MODEL=${p.model}`)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-electric-300 hover:text-electric-200"><Copy size={11} /> Copy env</button>
          </div>

          <IntegrationNote className="mt-3">
            Never give the key a <code className="rounded bg-black/30 px-1">VITE_</code> prefix — anything with that prefix is compiled into the browser bundle and readable by anyone. Only the endpoint URL is a <code className="rounded bg-black/30 px-1">VITE_</code> value.
          </IntegrationNote>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white"><ShieldCheck size={14} className="text-emerald-400" /> How it is wired</h2>
            <ol className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-ink-400">
              {[
                'The browser calls /api/ai-chat with { messages, system, temperature }.',
                'The function reads GEMINI_API_KEY from its environment and calls Gemini Flash.',
                'The answer comes back as { content } and is rendered in the chat.',
                'If anything is missing, the UI says exactly that — it never invents a reply.',
              ].map((t, i) => (
                <li key={i} className="flex gap-2"><span className="font-semibold text-electric-300">{i + 1}.</span><span>{t}</span></li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white"><Wrench size={14} className="text-amber-300" /> Common causes</h2>
            <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-ink-400">
              <li className="flex gap-2"><AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-300" /> Key added but the site not redeployed — env changes need a new deploy.</li>
              <li className="flex gap-2"><AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-300" /> Variable saved with the wrong scope — it must include Functions.</li>
              <li className="flex gap-2"><AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-300" /> Key valid but no credit / quota — the provider returns 429 or 402.</li>
              <li className="flex gap-2"><AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-300" /> Wrong base URL for the provider (OpenAI-compatible path is <code className="rounded bg-black/30 px-1">/chat/completions</code>).</li>
            </ul>
            <p className="mt-3 flex items-start gap-1.5 text-[10.5px] text-ink-600"><Bot size={11} className="mt-0.5 shrink-0" /> {HOW_TO_CONNECT}</p>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-white">What each function does</h2>
            <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-ink-400">
              <li><code className="rounded bg-black/30 px-1">ai-chat</code> — AI Assistant and PDF assistant</li>
              <li><code className="rounded bg-black/30 px-1">ai-notes</code> — structured notes from PDF text</li>
              <li><code className="rounded bg-black/30 px-1">ai-agent</code> — agent study questions</li>
              <li><code className="rounded bg-black/30 px-1">ai-health</code> — the connection test above</li>
              <li className="text-ink-500">Provider: <b className="text-ink-300">Google Gemini</b> (free tier) · model <code className="rounded bg-black/30 px-1">gemini-2.5-flash</code></li>
            </ul>
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-600">Usage limits are enforced server-side and sized for the Gemini free tier: AI_HOURLY_LIMIT (default 10) and AI_DAILY_LIMIT (default 50) per client. Set them as Vercel variables too.</p>
          </Card>
        </div>
      </div>

      <p className="flex items-center justify-center gap-2 pb-2 text-[11px] text-ink-600">
        <CheckCircle2 size={12} className="text-emerald-400/70" /> This page only configures; it never stores a key in the browser.
      </p>
    </div>
  )
}
