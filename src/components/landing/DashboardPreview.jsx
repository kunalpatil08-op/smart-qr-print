import { motion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, Printer, TrendingUp, Clock } from 'lucide-react'
import { ProgressBar } from '../ui.jsx'

const BARS = [42, 58, 36, 72, 64, 88, 76]

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
      style={{ perspective: 1200 }}
    >
      <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-gradient-to-br from-electric-400/20 via-transparent to-violet-500/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-navy-850/90 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 rounded-md bg-white/5 px-2 py-0.5 text-[10.5px] text-ink-500">app.smartqrprint.com/dashboard</span>
        </div>

        <div className="grid grid-cols-[58px_1fr] sm:grid-cols-[64px_1fr]">
          {/* mini sidebar */}
          <div className="border-r border-white/6 p-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`mb-2 grid h-8 w-full place-items-center rounded-lg ${i === 0 ? 'bg-electric-500/25 ring-1 ring-electric-400/40' : 'bg-white/[0.04]'}`}>
                <span className={`h-3 w-3 rounded-[3px] ${i === 0 ? 'bg-electric-300' : 'bg-white/20'}`} />
              </div>
            ))}
          </div>

          <div className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-500">Dashboard</p>
                <p className="mt-0.5 text-[13px] font-semibold text-white">Welcome back, Aarav</p>
              </div>
              <span className="rounded-full bg-emerald-400/12 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-300 ring-1 ring-emerald-400/25">Live</span>
            </div>

            {/* stat tiles */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { icon: Printer, label: 'Orders', value: '12', tone: 'text-electric-300' },
                { icon: Clock, label: 'In queue', value: '02', tone: 'text-amber-300' },
                { icon: TrendingUp, label: 'Pages', value: '186', tone: 'text-emerald-300' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                  <s.icon size={12} className={s.tone} />
                  <p className="mt-1 font-display text-[15px] font-bold leading-none text-white">{s.value}</p>
                  <p className="mt-1 text-[9px] text-ink-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* chart */}
            <div className="mt-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-medium text-ink-400">Print usage · last 7 days</p>
                <ArrowUpRight size={11} className="text-ink-500" />
              </div>
              <div className="mt-2 flex h-16 items-end gap-1.5">
                {BARS.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.5 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex-1 rounded-t-[3px] ${i === 5 ? 'bg-gradient-to-t from-electric-600 to-electric-300' : 'bg-white/12'}`}
                  />
                ))}
              </div>
            </div>

            {/* order row */}
            <div className="mt-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
              <div className="flex items-center justify-between">
                <p className="truncate text-[10px] font-medium text-ink-100">DBMS Revision Sheet.pdf</p>
                <span className="ml-2 shrink-0 text-[9px] font-semibold text-amber-300">In queue</span>
              </div>
              <ProgressBar value={62} className="mt-2" />
              <div className="mt-2 flex items-center gap-1 text-[9px] text-ink-500">
                <CheckCircle2 size={9} className="text-emerald-400" /> Payment verified · ₹27.00
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating AI chip */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-4 bottom-10 hidden rounded-xl border border-violet-400/30 bg-navy-800/95 px-3 py-2 shadow-xl backdrop-blur sm:block"
      >
        <p className="text-[9px] uppercase tracking-wider text-violet-300">AI assistant</p>
        <p className="mt-0.5 text-[10.5px] text-ink-200">“Explain Fourier transforms”</p>
      </motion.div>
    </motion.div>
  )
}
