import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, ClipboardList, Printer, IndianRupee, BarChart3, Settings,
  LogOut, Menu, Bell, Store, ExternalLink,
} from 'lucide-react'
import Logo from '../../components/Logo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/Toast.jsx'

const NAV = [
  { to: '/shop-owner', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/shop-owner/orders', label: 'Orders', icon: ClipboardList },
  { to: '/shop-owner/queue', label: 'Print queue', icon: Printer },
  { to: '/shop-owner/pricing', label: 'Pricing', icon: IndianRupee },
  { to: '/shop-owner/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/shop-owner/settings', label: 'Shop settings', icon: Settings },
]

export default function ShopLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  const doLogout = () => {
    logout()
    toast('Signed out.', 'info')
    navigate('/')
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5"><Logo /></div>
      <div className="mx-3 mb-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-violet-300"><Store size={11} /> Shop owner</p>
        <p className="mt-1 truncate text-[12.5px] font-semibold text-white">{user?.name}</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${isActive ? 'text-white' : 'text-ink-400 hover:bg-white/[0.04] hover:text-ink-100'}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="shop-nav" className="absolute inset-0 rounded-xl bg-violet-500/15 ring-1 ring-violet-400/25" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <n.icon size={16.5} className={`relative z-10 ${isActive ? 'text-violet-300' : ''}`} />
                <span className="relative z-10">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/8 p-3">
        <Link to={`/shop/${user?.id}`} target="_blank" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-ink-400 hover:bg-white/[0.04] hover:text-ink-100">
          <ExternalLink size={13} /> View my public shop page
        </Link>
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-ink-400 transition-colors hover:bg-rose-500/10 hover:text-rose-200">
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
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', stiffness: 340, damping: 34 }} className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-white/10 bg-navy-900 lg:hidden">
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/8 bg-navy-900/85 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink-300 hover:bg-white/8 lg:hidden" aria-label="Open navigation"><Menu size={19} /></button>
          <p className="text-[13px] font-medium text-ink-300">{user?.name} · Shop console</p>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-white" aria-label="Notifications"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet-400" /></button>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400/30 to-electric-500/30 text-[11px] font-bold text-white">
              {user?.ownerName?.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </span>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-6xl"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
