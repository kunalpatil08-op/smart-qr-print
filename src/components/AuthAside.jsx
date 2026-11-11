import { motion } from 'framer-motion'
import { QrCode, Bot, NotebookPen, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const POINTS = [
  { icon: QrCode, title: 'One QR, zero queues', desc: 'Upload once, then track your order to the counter.' },
  { icon: Bot, title: 'An AI tutor beside you', desc: 'Step-by-step explanations for every subject.' },
  { icon: NotebookPen, title: 'Notes that are yours', desc: 'Generate, edit and print study notes in minutes.' },
]

export default function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden border-l border-white/8 bg-navy-950/60 lg:flex lg:flex-col lg:justify-between lg:p-14">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-70" />
      <div className="pointer-events-none absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-electric-500/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-violet-500/20 blur-[100px]" />

      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-electric-300">SMART QR PRINT</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-white">
          Print Smarter.<br />Study Better.<br />Achieve More.
        </h2>
      </div>

      <div className="relative space-y-3">
        {POINTS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.45 }}
            className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3.5 backdrop-blur"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-electric-400/10 text-electric-300 ring-1 ring-electric-400/25">
              <p.icon size={16} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-white">{p.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-400">{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative flex items-center gap-2 text-[11.5px] text-ink-500">
        <ShieldCheck size={13} className="text-emerald-400/80" />
        Documents are private to your account and deleted on a retention schedule.
        <Link to="/" className="ml-auto text-electric-300 hover:text-electric-200">Home</Link>
      </div>
    </aside>
  )
}
