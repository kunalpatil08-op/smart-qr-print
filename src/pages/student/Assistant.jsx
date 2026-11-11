import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot, Plus, Send, Copy, RefreshCw, Trash2, Paperclip, User, Sparkles,
  MessageSquare, X, StopCircle, AlertTriangle, Wrench, PlugZap,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState } from '../../components/ui.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { AI_MODEL, isAIConfigured, requestCompletion, NOT_CONFIGURED_MESSAGE } from '../../lib/ai.js'
import { extractPdfText } from '../../lib/pdfText.js'
import { timeAgo, uid } from '../../lib/db.js'

const SUGGESTIONS = [
  { icon: '📘', text: 'Explain normalisation in DBMS with an example.' },
  { icon: '🧮', text: 'Solve: find the eigenvalues of [[2,1],[1,2]].' },
  { icon: '💻', text: 'Explain time complexity of quicksort in simple terms.' },
  { icon: '📝', text: 'Summarise the key points of my OS unit on scheduling.' },
  { icon: '🎯', text: 'Build me a 7-day revision plan for Data Structures.' },
  { icon: '⚡', text: 'What is the difference between process and thread?' },
]

const SUBJECTS = ['General', 'Mathematics', 'Programming', 'Data Structures', 'Operating Systems', 'DBMS', 'Electronics', 'Physics']

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="text-white">{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="rounded bg-white/10 px-1 py-0.5 text-[11.5px] text-electric-200">{p.slice(1, -1)}</code>
    return <span key={i}>{p}</span>
  })
}

function Markdownish({ text }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        const ol = line.match(/^(\d+)\.\s+(.*)$/)
        const ul = line.match(/^[-•*]\s+(.*)$/)
        if (ol) return <p key={i} className="flex gap-2 pl-0.5 text-[13px] leading-relaxed"><span className="font-semibold text-electric-300">{ol[1]}.</span><span>{renderInline(ol[2])}</span></p>
        if (ul) return <p key={i} className="flex gap-2 pl-0.5 text-[13px] leading-relaxed"><span className="text-electric-300">•</span><span>{renderInline(ul[1])}</span></p>
        if (line.startsWith('### ')) return <p key={i} className="pt-1 text-[13px] font-semibold text-white">{line.slice(4)}</p>
        return <p key={i} className="text-[13px] leading-relaxed">{renderInline(line)}</p>
      })}
    </div>
  )
}

function Message({ m, onCopy, onRegenerate, isLast, busy }) {
  const isUser = m.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${isUser ? 'bg-white/[0.06] ring-white/12 text-ink-200' : 'bg-gradient-to-br from-violet-400/25 to-electric-500/25 ring-violet-400/30 text-violet-200'}`}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </span>
      <div className={`max-w-[85%] ${isUser ? 'items-end' : ''}`}>
        <div className={`rounded-2xl px-4 py-2.5 ${isUser ? 'rounded-br-sm bg-electric-500/20 ring-1 ring-electric-400/25 text-ink-100' : 'rounded-bl-sm border border-white/8 bg-white/[0.03] text-ink-200'}`}>
          {m.pending ? (
            <div className="flex items-center gap-2 py-1">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-300/70" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }} />
              ))}
              <span className="text-[11px] text-ink-500">{AI_MODEL} is thinking…</span>
            </div>
          ) : m.unavailable ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-[12.5px] leading-relaxed text-amber-200/90">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{m.content}</span>
              </div>
              {m.setup && (
                <Link to="/app/ai-settings" className="inline-flex items-center gap-1.5 rounded-lg border border-electric-400/30 bg-electric-400/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-electric-200 hover:bg-electric-400/15">
                  <PlugZap size={11} /> Connect an AI provider
                </Link>
              )}
            </div>
          ) : (
            <Markdownish text={m.content} />
          )}
        </div>
        <div className={`mt-1.5 flex items-center gap-2 px-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-[10px] text-ink-600">{timeAgo(m.createdAt)}</span>
          {!isUser && !m.pending && (
            <>
              <button onClick={() => onCopy(m.content)} className="text-ink-500 transition-colors hover:text-ink-200" aria-label="Copy response"><Copy size={11} /></button>
              {isLast && (
                <button onClick={onRegenerate} disabled={busy} className="text-ink-500 transition-colors hover:text-ink-200 disabled:opacity-40" aria-label="Regenerate response"><RefreshCw size={11} /></button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Assistant() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useData()
  const toast = useToast()
  const convos = data.conversations()
  const [activeId, setActiveId] = useState(id || null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [attached, setAttached] = useState(null)
  const [subject, setSubject] = useState('General')
  const [listOpen, setListOpen] = useState(false)
  const fileRef = useRef(null)
  const scrollRef = useRef(null)

  const active = useMemo(() => convos.find((c) => c.id === activeId) || null, [convos, activeId])

  useEffect(() => { if (id) setActiveId(id) }, [id])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [active?.messages?.length, busy])

  const startNew = () => {
    setActiveId(null)
    setInput('')
    setAttached(null)
    setSubject('General')
    navigate('/app/assistant')
  }

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content && !attached) return
    if (busy) return
    let conv = active
    const attachNote = attached
      ? attachText
        ? `\n\n--- Attached document: ${attached.name} ---\n${attachText}`
        : `\n\n[Attached file: ${attached.name} — no readable text layer]`
      : ''
    const userMsg = { id: uid('m'), role: 'user', content: `${content}${attachNote}`, createdAt: new Date().toISOString() }
    if (!conv) {
      conv = data.createConversation({ title: content.slice(0, 60) || 'New conversation', subject, messages: [userMsg] })
      setActiveId(conv.id)
      navigate(`/app/assistant/${conv.id}`, { replace: true })
    } else {
      data.updateConversation(conv.id, { messages: [...conv.messages, userMsg] })
    }
    setInput('')
    setAttached(null)
    setAttachText('')
    setBusy(true)

    const pendingId = uid('m')
    const withPending = [...(conv.messages || []), userMsg, { id: pendingId, role: 'assistant', pending: true, createdAt: new Date().toISOString() }]
    data.updateConversation(conv.id, { messages: withPending })

    try {
      const history = withPending.filter((m) => !m.pending).map((m) => ({ role: m.role, content: m.content }))
      const res = await requestCompletion({
        system: `You are Smart AI Assistant inside SMART QR PRINT, a study helper for students. Subject focus: ${subject}. Explain clearly and concisely with steps, examples and exam tips. Use simple language. If the user attached a document, base your answer on its text.`,
        messages: history,
        task: 'assistant',
      })
      const finalMsg = res.configured
        ? { id: pendingId, role: 'assistant', content: res.content || '(The provider returned an empty response.)', createdAt: new Date().toISOString() }
        : {
            id: pendingId, role: 'assistant', unavailable: true, setup: true, createdAt: new Date().toISOString(),
            content: NOT_CONFIGURED_MESSAGE,
          }
      const current = data.conversations().find((c) => c.id === conv.id)
      data.updateConversation(conv.id, { messages: [...(current?.messages || withPending).filter((m) => m.id !== pendingId), finalMsg] })
      if (!res.configured) toast('AI provider is not configured — no response generated.', 'warning')
    } catch (e) {
      const current = data.conversations().find((c) => c.id === conv.id)
      data.updateConversation(conv.id, {
        messages: [...(current?.messages || withPending).filter((m) => m.id !== pendingId), { id: pendingId, role: 'assistant', unavailable: true, content: e.message, createdAt: new Date().toISOString() }],
      })
      toast(e.message, 'error', { duration: 8000 })
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async () => {
    if (!active || busy) return
    const msgs = active.messages.filter((m) => !m.pending)
    const lastUserIdx = [...msgs].reverse().findIndex((m) => m.role === 'user')
    if (lastUserIdx === -1) return
    const keep = msgs.slice(0, msgs.length - lastUserIdx)
    const lastUser = msgs[msgs.length - lastUserIdx - 1]
    data.updateConversation(active.id, { messages: keep.slice(0, -1) })
    await send(lastUser.content)
  }

  const clearChat = () => {
    if (!active) return
    data.updateConversation(active.id, { messages: [] })
    toast('Conversation cleared.', 'info')
  }

  const deleteConvo = (cid) => {
    data.deleteConversation(cid)
    if (cid === activeId) startNew()
    toast('Conversation deleted.', 'info')
  }

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('Copied to clipboard.', 'success')
    } catch {
      toast('Clipboard is not available in this browser.', 'warning')
    }
  }

  const [reading, setReading] = useState(false)
  const [attachText, setAttachText] = useState('')

  const onFile = async (f) => {
    if (!f) return
    if (f.size > 10 * 1024 * 1024) return toast('File is larger than 10 MB.', 'error')
    setAttached(f)
    setAttachText('')
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      toast(`${f.name} attached. Only PDF text can be read automatically.`, 'info')
      return
    }
    setReading(true)
    try {
      const r = await extractPdfText(f, { maxChars: 24000 })
      if (r.hasText) {
        setAttachText(r.text)
        toast(`Read ${r.chars.toLocaleString()} characters from ${f.name}.`, 'success')
      } else {
        toast(r.note, 'warning', { duration: 7000 })
      }
    } catch {
      toast('Could not read that PDF in the browser.', 'error')
    } finally {
      setReading(false)
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button onClick={startNew} size="md" className="w-full"><Plus size={15} /> New conversation</Button>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {convos.length === 0 && <p className="px-3 py-6 text-center text-[11.5px] text-ink-600">No conversations yet.</p>}
        {convos.map((c) => (
          <div key={c.id} className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors ${c.id === activeId ? 'bg-electric-500/12 ring-1 ring-electric-400/25' : 'hover:bg-white/[0.04]'}`}>
            <button onClick={() => { setActiveId(c.id); navigate(`/app/assistant/${c.id}`); setListOpen(false) }} className="min-w-0 flex-1 text-left">
              <p className="truncate text-[12px] font-medium text-ink-100">{c.title}</p>
              <p className="text-[10px] text-ink-500">{c.messages.length} msg · {timeAgo(c.updatedAt)}</p>
            </button>
            <button onClick={() => deleteConvo(c.id)} className="text-ink-600 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100" aria-label="Delete conversation"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      <div className="border-t border-white/8 p-3">
        <div className={`rounded-xl border p-2.5 ${isAIConfigured ? 'border-emerald-400/25 bg-emerald-400/5' : 'border-amber-400/25 bg-amber-400/5'}`}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-100">
            <span className={`h-1.5 w-1.5 rounded-full ${isAIConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {isAIConfigured ? 'AI connected' : 'AI not configured'}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-ink-500">
            {isAIConfigured ? `Model: ${AI_MODEL}` : 'Responses are disabled until an endpoint is set.'}
          </p>
          <Link to="/app/ai-settings" className="mt-1.5 inline-block text-[10px] font-medium text-electric-300 hover:text-electric-200">{isAIConfigured ? 'Manage →' : 'Fix this →'}</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="hidden overflow-hidden lg:block lg:h-[calc(100vh-8.5rem)]">{sidebar}</Card>

      <AnimatePresence>
        {listOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex lg:hidden" onClick={() => setListOpen(false)}>
            <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" />
            <motion.div initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} onClick={(e) => e.stopPropagation()} className="relative h-full w-[250px] border-r border-white/10 bg-navy-900">
              <div className="flex justify-end p-2"><button onClick={() => setListOpen(false)} className="rounded p-1 text-ink-400"><X size={16} /></button></div>
              {sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="flex h-[calc(100vh-8.5rem)] min-h-[520px] flex-col overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3">
          <button onClick={() => setListOpen(true)} className="rounded-lg p-1.5 text-ink-400 hover:bg-white/8 lg:hidden" aria-label="Conversations"><MessageSquare size={16} /></button>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400/25 to-electric-500/25 ring-1 ring-violet-400/30"><Bot size={16} className="text-violet-200" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">Smart AI Assistant</p>
            <p className="text-[10.5px] text-ink-500">{active ? active.title : 'Start a new conversation'}</p>
          </div>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg border border-white/10 bg-navy-950/60 px-2 py-1.5 text-[11.5px] text-ink-200 outline-none" aria-label="Subject">
            {SUBJECTS.map((s) => <option key={s} className="bg-navy-900">{s}</option>)}
          </select>
          {active && active.messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat} className="hidden sm:inline-flex"><Trash2 size={13} /> Clear</Button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {!active || active.messages.length === 0 ? (
            <div className="mx-auto max-w-xl py-6 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-400/20 to-electric-500/20 ring-1 ring-violet-400/25"><Sparkles size={24} className="text-violet-200" /></span>
              <h2 className="mt-4 text-[17px] font-semibold text-white">How can I help you study today?</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] text-ink-400">Ask an academic question, paste your material or attach a file for a summary.</p>
              <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s.text} onClick={() => send(s.text)} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-[12px] text-ink-300 transition-all hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.05]">
                    <span className="mr-1.5">{s.icon}</span>{s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            active.messages.map((m, i) => (
              <Message key={m.id} m={m} onCopy={copy} onRegenerate={regenerate} isLast={i === active.messages.length - 1} busy={busy} />
            ))
          )}
        </div>

        {attached && (
          <div className="mx-4 mb-1 flex items-center gap-2 rounded-lg border border-electric-400/25 bg-electric-400/8 px-3 py-1.5">
            <Paperclip size={12} className="text-electric-300" />
            <span className="flex-1 truncate text-[11.5px] text-ink-200">{attached.name}{reading ? ' — reading…' : attachText ? ` · ${(attachText.length / 1000).toFixed(1)}k chars` : ''}</span>
            <button onClick={() => setAttached(null)} className="text-ink-400 hover:text-white" aria-label="Remove attachment"><X size={12} /></button>
          </div>
        )}

        <div className="border-t border-white/8 p-3">
          <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-navy-950/60 p-1.5 focus-within:border-electric-400/50">
            <button onClick={() => fileRef.current?.click()} disabled={reading} className="rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-ink-100 disabled:opacity-40" aria-label="Attach a file"><Paperclip size={16} /></button>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} accept=".pdf,.txt,.doc,.docx,.png,.jpg" />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={1}
              placeholder="Ask anything about your subject…"
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-[13px] text-ink-100 outline-none placeholder:text-ink-500"
              aria-label="Message"
            />
            <Button size="sm" onClick={() => send()} disabled={busy || (!input.trim() && !attached)} className="!px-3">
              {busy ? <StopCircle size={15} /> : <Send size={15} />}
            </Button>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-ink-600">
            <Wrench size={9} /> {isAIConfigured ? 'Live AI responses via your server endpoint.' : <>AI endpoint not set — <Link to="/app/ai-settings" className="text-electric-300 underline decoration-dotted hover:text-electric-200">connect a provider</Link>.</>} · API keys are never exposed to the browser.
          </p>
        </div>
      </Card>
    </div>
  )
}
