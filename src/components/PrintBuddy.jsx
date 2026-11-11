import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MessageCircle, X, Send, Sparkles, Loader2, Bot, ChevronDown, HelpCircle,
} from 'lucide-react'
import { requestCompletion } from '../lib/ai.js'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { fmtMoney } from '../lib/db.js'

/**
 * PrintBuddy — the small AI helper that can be opened from any page.
 *
 * It is given a CONTEXT block built from the real shop list and rates, so its
 * answers use actual prices and never invent a shop or an order. It cannot place
 * orders, take payment or change anything: it only explains and guides.
 */

const QUICK = [
  'How do I print a PDF?',
  'What will 20 pages cost?',
  'Colour or black & white?',
  'How do I collect my printout?',
]

function buildContext({ shops, printers, page }) {
  const lines = [`Current page: ${page || 'unknown'}`]
  lines.push('Shops (real data):')
  shops.slice(0, 4).forEach((s) => {
    const ps = printers.filter((p) => p.shopId === s.id)
    const online = ps.filter((p) => p.status === 'online').length
    lines.push(
      `- ${s.name} (code ${s.id})${s.open ? '' : ' — CLOSED'}; ${online}/${ps.length} printers online; ` +
      `B&W ₹${s.pricing.bwSingle}/page single, ₹${s.pricing.bwDouble}/page double; ` +
      `colour ₹${s.pricing.colorSingle}/page single, ₹${s.pricing.colorDouble}/page double; ` +
      `A3 multiplier ×${s.pricing.a3Multiplier}; spiral binding ₹${s.pricing.binding}; files deleted after ${s.retentionHours || 24}h.`,
    )
  })
  lines.push(
    'Payment: live payments are NOT configured. Only clearly-labelled demo payment is available (TEST – NO REAL MONEY PAID); ' +
    'a demo result never releases a print job. Price = rate per page × sheets × copies × paper factor + optional binding.',
  )
  return lines.join('\n')
}

function Bubble({ m }) {
  const isUser = m.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-electric-400/30 to-violet-500/25 ring-1 ring-electric-400/30">
          <Sparkles size={11} className="text-electric-200" />
        </span>
      )}
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${isUser ? 'rounded-br-sm bg-electric-500/20 text-ink-100 ring-1 ring-electric-400/25' : 'rounded-bl-sm border border-white/8 bg-white/[0.04] text-ink-200'}`}>
        {m.pending ? (
          <span className="flex items-center gap-1.5 py-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-electric-300/70" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
            ))}
            <span className="ml-1 text-[10.5px] text-ink-500">PrintBuddy is typing…</span>
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{m.content}</span>
        )}
      </div>
    </div>
  )
}

export default function PrintBuddy() {
  const data = useData()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [nudge, setNudge] = useState(false)
  const scrollRef = useRef(null)
  const openedOnce = useRef(false)

  // A single, gentle nudge after a few seconds on the site — dismissible, never blocking.
  useEffect(() => {
    if (openedOnce.current) return
    const t = setTimeout(() => setNudge(true), 9000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const ask = useCallback(async (text) => {
    const question = (text ?? input).trim()
    if (!question || busy) return
    setInput('')
    setBusy(true)
    setNudge(false)
    openedOnce.current = true
    const history = [...messages, { role: 'user', content: question }]
    setMessages([...history, { role: 'assistant', pending: true }])

    const context = buildContext({
      shops: data.shops(),
      printers: data.printers(),
      page: window.location.hash || '/',
    })

    try {
      const res = await requestCompletion({
        task: 'buddy',
        system: `You are PrintBuddy for SMART QR PRINT. Answer using only this real data:\n\n${context}`,
        messages: history.slice(-8).map(({ role, content }) => ({ role, content })),
        temperature: 0.3,
      })
      const answer = res.configured
        ? res.content
        : 'I am not connected to the AI service on this deployment, so I cannot answer right now. You can still print: open Print now, upload your PDF and follow the steps.'
      setMessages([...history, { role: 'assistant', content: answer }])
    } catch (e) {
      setMessages([...history, { role: 'assistant', content: `Sorry — ${e.message}` }])
    } finally {
      setBusy(false)
    }
  }, [input, busy, messages, data])

  return (
    <>
      {/* launcher + nudge */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 print:hidden">
        <AnimatePresence>
          {nudge && !open && (
            <motion.button
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={() => { setOpen(true); setNudge(false) }}
              className="max-w-[240px] rounded-2xl rounded-br-sm border border-white/12 bg-navy-800/95 px-3 py-2 text-left text-[11.5px] leading-snug text-ink-200 shadow-xl backdrop-blur"
            >
              <span className="font-semibold text-white">Need help printing?</span> I can explain the steps and prices. 👋
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => { setOpen((o) => !o); setNudge(false); openedOnce.current = true }}
          whileTap={{ scale: 0.94 }}
          className="relative grid h-13 w-13 place-items-center rounded-full bg-gradient-to-br from-electric-400 to-electric-600 text-white shadow-[0_10px_30px_-8px_rgba(37,99,235,0.9)] ring-1 ring-white/20"
          style={{ height: 52, width: 52 }}
          aria-label={open ? 'Close PrintBuddy' : 'Open PrintBuddy, the printing helper'}
          aria-expanded={open}
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ opacity: 0 }}><X size={20} /></motion.span>
              : <motion.span key="c" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ opacity: 0 }}><MessageCircle size={20} /></motion.span>}
          </AnimatePresence>
          {!open && !nudge && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-navy-900" />}
        </motion.button>
      </div>

      {/* panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-20 right-3 left-3 z-[61] flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-white/12 bg-navy-850/98 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-4 sm:w-[360px]"
            role="dialog"
            aria-label="PrintBuddy helper"
          >
            <div className="flex items-center gap-2.5 border-b border-white/8 bg-gradient-to-r from-electric-600/20 to-violet-600/15 px-3.5 py-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20"><Bot size={15} className="text-electric-200" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-white">PrintBuddy</p>
                <p className="text-[10px] text-ink-400">Helps with printing · powered by Gemini</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-400 hover:bg-white/10 hover:text-white" aria-label="Minimise"><ChevronDown size={15} /></button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
              {messages.length === 0 && (
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-electric-400/30 to-violet-500/25 ring-1 ring-electric-400/30"><Sparkles size={11} className="text-electric-200" /></span>
                    <div className="rounded-2xl rounded-bl-sm border border-white/8 bg-white/[0.04] px-3 py-2 text-[12.5px] leading-relaxed text-ink-200">
                      Hi{user ? ` ${user.name.split(' ')[0]}` : ''}! I can help you print, explain the price of any page count, and tell you how to collect your printout. What do you need?
                    </div>
                  </div>
                  <div className="space-y-1.5 pl-8">
                    {QUICK.map((q) => (
                      <button key={q} onClick={() => ask(q)} className="flex w-full items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-left text-[11.5px] text-ink-300 transition-colors hover:border-electric-400/30 hover:text-white">
                        <HelpCircle size={11} className="shrink-0 text-electric-300" /> {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => <Bubble key={i} m={m} />)}
            </div>

            <div className="border-t border-white/8 p-2.5">
              <div className="flex items-end gap-1.5 rounded-xl border border-white/10 bg-navy-950/60 p-1.5 focus-within:border-electric-400/50">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
                  rows={1}
                  placeholder="Ask about printing…"
                  aria-label="Message PrintBuddy"
                  className="max-h-24 min-h-[34px] flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[12.5px] text-ink-100 outline-none placeholder:text-ink-500"
                />
                <button
                  onClick={() => ask()}
                  disabled={busy || !input.trim()}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-b from-electric-400 to-electric-600 text-white disabled:opacity-40"
                  aria-label="Send"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <p className="mt-1 px-1 text-[9.5px] text-ink-600">
                Guides only — cannot place orders or take payment. Prices shown in ₹ from the shop list.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
