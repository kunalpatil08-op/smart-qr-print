import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, Trash2, Bot, Zap } from 'lucide-react'
import { useAgent } from '../context/AgentContext.jsx'
import { timeAgo } from '../lib/db.js'

export default function AgentWidget() {
  const agent = useAgent()
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const items = agent.notifications()
  const prev = useRef(agent.unread)

  useEffect(() => {
    if (agent.unread > prev.current) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 1600)
      return () => clearTimeout(t)
    }
    prev.current = agent.unread
  }, [agent.unread])

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <motion.button
        onClick={() => { setOpen((o) => !o); if (!open) setTimeout(() => agent.markAllRead(), 900) }}
        animate={pulse ? { scale: [1, 1.12, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="relative rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/8 hover:text-white"
        aria-label={`Agent notifications${agent.unread ? `, ${agent.unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={17} />
        {agent.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-electric-500 px-1 text-[9px] font-bold text-white ring-2 ring-navy-900">{agent.unread}</span>
        )}
        {agent.status.engine === 'running' && <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-11 z-50 w-[320px] overflow-hidden rounded-xl border border-white/12 bg-navy-850/98 shadow-2xl backdrop-blur-xl"
            role="dialog"
            aria-label="Agent notifications"
          >
            <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
              <div>
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white"><Bot size={12} className="text-violet-300" /> SMART AI AGENT</p>
                <p className="text-[9.5px] text-ink-500">{agent.status.engine === 'running' ? 'Engine live · checks every 30 s' : 'Engine idle'}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => agent.markAllRead()} className="rounded p-1 text-ink-500 hover:bg-white/8 hover:text-ink-100" aria-label="Mark all read"><CheckCheck size={13} /></button>
                <button onClick={() => agent.clearNotifications()} className="rounded p-1 text-ink-500 hover:bg-white/8 hover:text-rose-300" aria-label="Clear notifications"><Trash2 size={13} /></button>
              </div>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {items.length === 0 && (
                <li className="px-4 py-8 text-center">
                  <Zap size={18} className="mx-auto text-ink-600" />
                  <p className="mt-2 text-[11.5px] text-ink-400">No agent messages yet.</p>
                  <p className="mt-0.5 text-[10.5px] text-ink-600">Your agents will report here when they run.</p>
                </li>
              )}
              {items.map((n) => (
                <li key={n.id} className={`border-b border-white/6 px-3.5 py-2.5 last:border-0 ${n.read ? '' : 'bg-electric-400/[0.05]'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${n.tone === 'error' ? 'bg-rose-400' : n.tone === 'warning' ? 'bg-amber-400' : 'bg-electric-400'}`} />
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-ink-100">{n.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{n.body}</p>
                      <p className="mt-0.5 text-[9.5px] text-ink-600">{timeAgo(n.at)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-white/8 p-2">
              <Link to="/app/agent" onClick={() => setOpen(false)} className="block rounded-lg px-2.5 py-2 text-center text-[11.5px] font-medium text-electric-300 hover:bg-white/[0.05] hover:text-electric-200">
                Open SMART AI AGENT →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
