import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Loader2, Inbox } from 'lucide-react'

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 select-none disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap'

const VARIANTS = {
  primary:
    'bg-gradient-to-b from-electric-400 to-electric-600 text-white shadow-[0_10px_30px_-10px_rgba(37,99,235,0.9)] hover:shadow-[0_14px_36px_-8px_rgba(56,189,248,0.7)] hover:brightness-110',
  secondary:
    'bg-white/[0.04] text-ink-100 border border-white/12 hover:bg-white/[0.09] hover:border-white/25',
  ghost: 'text-ink-300 hover:text-white hover:bg-white/[0.06]',
  danger: 'bg-rose-500/15 text-rose-200 border border-rose-400/30 hover:bg-rose-500/25',
  success: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/25',
}

const SIZES = {
  sm: 'text-[13px] px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-[15px] px-6 py-3.5',
}

export function Button({ variant = 'primary', size = 'md', className = '', loading, children, as = 'button', to, href, ...rest }) {
  const cls = `${BTN_BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  const content = (
    <>
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </>
  )
  const MotionEl = as === 'a' ? motion.a : motion.button
  if (to) return <motion.div whileTap={{ scale: 0.975 }} className="inline-flex"><Link to={to} className={cls} {...rest}>{content}</Link></motion.div>
  return (
    <MotionEl whileTap={{ scale: 0.975 }} whileHover={{ y: -1 }} className={cls} {...(as === 'a' ? { href } : {})} {...rest}>
      {content}
    </MotionEl>
  )
}

export function Card({ className = '', children, hover, ...rest }) {
  return (
    <div
      className={`card ${hover ? 'transition-all duration-300 hover:border-electric-400/30 hover:shadow-[0_18px_50px_-24px_rgba(37,99,235,0.8)] hover:-translate-y-0.5' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Badge({ tone = 'blue', children, className = '', dot }) {
  const tones = {
    blue: 'bg-electric-400/12 text-electric-300 border-electric-400/25',
    green: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
    amber: 'bg-amber-400/12 text-amber-300 border-amber-400/25',
    red: 'bg-rose-400/12 text-rose-300 border-rose-400/25',
    slate: 'bg-white/[0.06] text-ink-300 border-white/12',
    violet: 'bg-violet-400/12 text-violet-300 border-violet-400/25',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${tones[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Input({ label, error, hint, className = '', ...rest }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink-300">{label}</span>}
      <input
        className={`w-full rounded-xl border bg-navy-950/60 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none transition-all focus:border-electric-400/60 focus:ring-4 focus:ring-electric-400/10 ${error ? 'border-rose-400/60' : 'border-white/10 hover:border-white/20'} ${className}`}
        {...rest}
      />
      {hint && !error && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  )
}

export function Textarea({ label, className = '', ...rest }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink-300">{label}</span>}
      <textarea
        className={`w-full rounded-xl border border-white/10 bg-navy-950/60 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none transition-all focus:border-electric-400/60 focus:ring-4 focus:ring-electric-400/10 hover:border-white/20 ${className}`}
        {...rest}
      />
    </label>
  )
}

export function Select({ label, className = '', children, ...rest }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink-300">{label}</span>}
      <select
        className={`w-full appearance-none rounded-xl border border-white/10 bg-navy-950/60 px-3.5 py-2.5 text-sm text-ink-100 outline-none transition-all focus:border-electric-400/60 focus:ring-4 focus:ring-electric-400/10 hover:border-white/20 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </label>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm text-ink-300 hover:text-ink-100 transition-colors"
    >
      <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-electric-500' : 'bg-white/15'}`}>
        <motion.span layout className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow" animate={{ left: checked ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
      </span>
      {label}
    </button>
  )
}

export function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl border border-white/10 bg-navy-950/60 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${value === o.value ? 'text-white' : 'text-ink-400 hover:text-ink-100'}`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join('')}`} className="absolute inset-0 rounded-lg bg-electric-500/25 ring-1 ring-electric-400/40" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, subtitle, center, className = '' }) {
  return (
    <div className={`${center ? 'text-center mx-auto' : ''} max-w-2xl ${className}`}>
      {eyebrow && (
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-electric-400/25 bg-electric-400/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-electric-300">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-ink-300 leading-relaxed">{subtitle}</p>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`shimmer rounded-lg ${className}`} />
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-electric-400/10 border border-electric-400/20 text-electric-300">
        <Icon size={24} />
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        role="dialog"
        aria-modal="true"
        className={`relative card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-6 max-h-[88vh] overflow-auto`}
      >
        <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
        {children}
      </motion.div>
    </div>
  )
}

export function ProgressBar({ value, tone = 'blue', className = '' }) {
  const tones = { blue: 'from-electric-400 to-electric-600', green: 'from-emerald-400 to-emerald-600', amber: 'from-amber-400 to-orange-500', red: 'from-rose-400 to-rose-600' }
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/8 ${className}`}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className={`h-full rounded-full bg-gradient-to-r ${tones[tone]}`} />
    </div>
  )
}

export function IntegrationNote({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-dashed border-amber-400/30 bg-amber-400/[0.05] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-200/90 ${className}`}>
      {children}
    </div>
  )
}
