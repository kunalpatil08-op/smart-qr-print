import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Printer, Bot, NotebookPen, Scissors, Files, ClipboardList,
  User, LogOut, Menu, X, ChevronRight, Search, BotMessageSquare, PlugZap,
} from 'lucide-react'
import Logo from '../../components/Logo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import AgentWidget from '../../components/AgentWidget.jsx'
import { isAIConfigured } from '../../lib/ai.js'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/print', label: 'Upload & Print', icon: Printer },
  { to: '/app/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/app/agent', label: 'AI Agent', icon: BotMessageSquare },
  { to: '/app/notes', label: 'AI Notes', icon: NotebookPen },
  { to: '/app/pdf-editor', label: 'PDF Editor', icon: Scissors },
  { to: '/app/documents', label: 'My Documents', icon: Files },
  { to: '/app/orders', label: 'Print Orders', icon: ClipboardList },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/ai-settings', label: 'AI provider', icon: PlugZap },
]

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => setOpen(false), [navigate])

  const doLogout = () => {
    logout()
    toast('Signed out. See you soon.', 'info')
    navigate('/')
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${isActive ? 'text-white' : 'text-ink-400 hover:bg-white/[0.04] hover:text-ink-100'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="student-nav" className="absolute inset-0 rounded-xl bg-electric-500/12 ring-1 ring-electric-400/25" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <n.icon size={16.5} className={`relative z-10 ${isActive ? 'text-electric-300' : ''}`} />
                <span className="relative z-10">{n.label}</span>
                {isActive && <ChevronRight size={13} className="relative z-10 ml-auto text-electric-300/70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/8 p-3">
        <div className="rounded-xl bg-gradient-to-br from-electric-600/20 to-violet-600/15 p-3 ring-1 ring-white/10">
          <p className="text-[11px] font-semibold text-white">AI provider</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{isAIConfigured ? 'Connected — assistant is live.' : 'Not connected. Add an endpoint to enable answers.'}</p>
          <Link to="/app/ai-settings" className="mt-2 inline-block text-[11px] font-medium text-electric-300 hover:text-electric-200">{isAIConfigured ? 'Manage provider →' : 'Connect AI →'}</Link>
        </div>
        <button onClick={doLogout} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-ink-400 transition-colors hover:bg-rose-500/10 hover:text-rose-200">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[252px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-white/8 bg-navy-950/50 backdrop-blur-xl lg:block">{sidebar}</aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-navy-950/70 backdrop-blur-sm lg:hidden" />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-white/10 bg-navy-900 lg:hidden"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/8 bg-navy-900/85 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink-300 hover:bg-white/8 lg:hidden" aria-label="Open navigation"><Menu size={19} /></button>
          <div className="hidden items-center gap-2 rounded-xl border border-white/8 bg-navy-950/50 px-3 py-2 sm:flex">
            <Search size={14} className="text-ink-500" />
            <input placeholder="Search documents, notes…" className="w-48 bg-transparent text-[12.5px] text-ink-100 outline-none placeholder:text-ink-500 xl:w-64" />
            <kbd className="rounded border border-white/10 px-1 text-[10px] text-ink-500">/</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <AgentWidget />
            <Link to="/app/profile" className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] py-1.5 pl-1.5 pr-3 transition-colors hover:border-white/20">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-electric-400/30 to-violet-500/30 text-[11px] font-bold text-white">
                {user?.name?.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[12px] font-semibold leading-none text-white">{user?.name}</span>
                <span className="mt-0.5 block text-[10px] leading-none text-ink-500">Student</span>
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
