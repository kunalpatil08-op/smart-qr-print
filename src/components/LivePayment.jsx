import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge, Button, Card } from './ui.jsx'
import { fmtMoney } from '../lib/db.js'
import { livePaymentProvider, liveLabel, startRazorpayPayment } from '../lib/payments.js'
import { useToast } from './Toast.jsx'
import {
  CreditCard, ShieldCheck, Loader2, XCircle, Smartphone, Building2, Wallet,
  Lock, ArrowRight, PartyPopper, Printer, TicketCheck,
} from 'lucide-react'

/**
 * Live checkout card — the real-money path (Razorpay), separate from DemoPayment.
 *
 * States: idle → opening → failed | dismissed, and on success the parent swaps
 * to <CheckoutSuccess/> (full-screen animation + receipt + collect steps), not
 * back to this card. Nothing here is simulated: a success only arrives from
 * Razorpay's own handler.
 */

const METHOD_TILES = [
  { icon: Smartphone, label: 'UPI', hint: 'GPay · PhonePe · Paytm' },
  { icon: CreditCard, label: 'Card', hint: 'Debit / credit' },
  { icon: Building2, label: 'Netbanking', hint: 'All major banks' },
  { icon: Wallet, label: 'Wallet', hint: 'Razorpay wallets' },
]

export default function LivePayment({ order, shopName, prefill, onVerified, compact }) {
  const toast = useToast()
  const [state, setState] = useState('idle') // idle | opening | failed
  const [error, setError] = useState('')
  const configured = livePaymentProvider.configured
  const demo = livePaymentProvider.mode !== 'live'

  const pay = async () => {
    if (!configured) {
      toast('Live payments are not configured in this build. Use demo payment, or add VITE_RAZORPAY_KEY_ID and rebuild.', 'warning', { duration: 6500 })
      return
    }
    setState('opening')
    setError('')
    await startRazorpayPayment({
      order,
      shopName,
      prefill,
      onVerified: (receipt) => {
        setState('idle')
        onVerified?.(receipt)
      },
      onFailed: (info) => {
        setState('failed')
        setError(info?.message || 'Payment failed. Nothing was charged.')
      },
      onDismissed: () => setState('idle'),
    })
  }

  return (
    <Card className={compact ? 'p-4' : 'p-5'}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30">
            <ShieldCheck size={15} />
          </span>
          Pay now
        </h3>
        <Badge tone={configured ? (demo ? 'amber' : 'green') : 'slate'} dot>
          {configured ? (demo ? 'Test mode' : 'Live') : 'Not configured'}
        </Badge>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-navy-950/40 px-3 py-2.5">
        <div>
          <p className="text-[10.5px] text-ink-500">Order #{String(order.id).replace('ord_', '')}</p>
          <p className="max-w-[220px] truncate text-[12px] font-medium text-ink-100">{order.docName}</p>
        </div>
        <p className="font-display text-xl font-bold text-white">{fmtMoney(order.amount)}</p>
      </div>

      {configured && (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {METHOD_TILES.map((m) => (
            <div key={m.label} className="rounded-xl border border-white/8 bg-white/[0.02] p-2 text-center">
              <m.icon size={14} className="mx-auto text-electric-300" />
              <p className="mt-1 text-[10px] font-semibold text-white">{m.label}</p>
              <p className="text-[8.5px] text-ink-600">{m.hint}</p>
            </div>
          ))}
        </div>
      )}

      {!configured ? (
        <div className="mt-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-ink-400">
          <p className="font-semibold text-ink-200">Real checkout is one key away.</p>
          <p className="mt-1">Add <code className="rounded bg-black/40 px-1 font-mono">VITE_RAZORPAY_KEY_ID=rzp_test_…</code> to your <code className="rounded bg-black/40 px-1">.env.local</code> (local) or Vercel → Environment Variables, then rebuild. The demo payment below keeps working meanwhile.</p>
        </div>
      ) : (
        <Button className="mt-3 w-full !py-3" onClick={pay} loading={state === 'opening'}>
          {state === 'opening' ? <><Loader2 size={15} className="animate-spin" /> Opening Razorpay…</> : <><Lock size={14} /> Pay {fmtMoney(order.amount)} securely</>}
        </Button>
      )}

      {demo && configured && (
        <p className="mt-1.5 text-center text-[10px] text-amber-300/80">TEST MODE — Razorpay test keys: no real money moves. Use UPI id <b>success@razorpay</b> or card <b>4111 1111 1111 1111</b>.</p>
      )}

      <AnimatePresence>
        {state === 'failed' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-2.5 text-[11.5px] text-rose-200">
            <XCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-2 text-center text-[10px] text-ink-600">{liveLabel()} · {configured ? 'Secured by Razorpay · UPI · Cards · Netbanking' : 'Demo payment stays available for the hackathon judging flow.'}</p>
    </Card>
  )
}

/**
 * Full-screen success celebration shown right after a verified payment.
 * Confetti burst → tick → receipt card → "collect your prints" steps → CTA.
 * Also reused by the guest flow, so both end in the same celebration.
 */
export function CheckoutSuccess({ receipt, order, shop, onTrack, onNewOrder, pickupCode }) {
  const code = pickupCode || String(order?.id || '').replace('ord_', '').toUpperCase()
  const confetti = useMemo(() => Array.from({ length: 42 }, (_, i) => ({
    x: (Math.sin(i * 12.9898) * 43758.5453 % 1) * 220,
    delay: (i % 14) * 0.045,
    dur: 1.5 + ((i * 7) % 10) / 12,
    color: ['#34d399', '#4f6df5', '#fbbf24', '#f472b6', '#22d3ee'][i % 5],
    size: 5 + ((i * 13) % 5),
    round: i % 3 === 0,
  })), [])
  const timers = useRef([])
  const [copied, setCopied] = useState(false)
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      timers.current.push(setTimeout(() => setCopied(false), 1800))
    } catch { /* clipboard unavailable */ }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-3xl border border-emerald-400/25 bg-gradient-to-b from-emerald-500/[0.10] via-navy-900 to-navy-950 p-6 text-center sm:p-8">
      {/* confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {confetti.map((c, i) => (
          <motion.span
            key={i}
            initial={{ x: 0, y: -10, opacity: 1, rotate: 0 }}
            animate={{ x: c.x - 110, y: 340, opacity: 0, rotate: 540 }}
            transition={{ delay: 0.15 + c.delay, duration: c.dur, ease: 'easeIn' }}
            className="absolute left-1/2 top-6"
            style={{ width: c.size, height: c.size * (c.round ? 1 : 0.55), background: c.color, borderRadius: c.round ? '50%' : 2 }}
          />
        ))}
      </div>

      {/* tick */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
        className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-400 text-navy-950 shadow-[0_0_60px_rgba(52,211,153,0.45)]"
      >
        <motion.svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M4 12.5l5 5L20 6.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
        </motion.svg>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
          <PartyPopper size={13} /> Payment successful
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Now go grab your prints!</h2>
        <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-ink-300">
          {fmtMoney(order?.amount)} received from you. Your job is now with <b className="text-white">{shop?.name || 'the shop'}</b> — show this code at the counter and collect your printout.
        </p>
      </motion.div>

      {/* pickup code */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mx-auto mt-5 max-w-sm rounded-2xl border-2 border-dashed border-emerald-400/40 bg-navy-950/60 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">Pickup code</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-white">{code}</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={copyCode}>{copied ? 'Copied!' : 'Copy code'}</Button>
      </motion.div>

      {/* receipt */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mx-auto mt-4 max-w-sm overflow-hidden rounded-2xl bg-white text-left text-slate-900">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">SMART QR PRINT · Agent X</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Payment receipt{livePaymentProvider.mode !== 'live' ? ' · hackathon demo' : ''}</p>
            </div>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9.5px] font-bold uppercase text-emerald-700">Paid</span>
          </div>
        </div>
        <div className="space-y-1.5 p-4 text-[12px]">
          {[
            ['Amount paid', fmtMoney(order?.amount)],
            ['Document', order?.docName || '—'],
            ['Pages × copies', `${order?.pages ?? '—'} × ${order?.copies ?? 1}`],
            ['Shop', shop?.name || '—'],
            ['Payment ID', receipt?.razorpayPaymentId || receipt?.id || '—'],
            ['Date', receipt?.createdAt ? new Date(receipt.createdAt).toLocaleString('en-IN') : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <span className="text-slate-500">{k}</span>
              <span className="max-w-[62%] truncate text-right font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-slate-200 bg-slate-50 px-4 py-2.5">
          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">Show the pickup code at the counter</p>
        </div>
      </motion.div>

      {/* collect steps */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mx-auto mt-4 max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white"><TicketCheck size={14} className="text-emerald-300" /> Collect in 3 steps</p>
        <ol className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-ink-300">
          <li><b className="text-white">1.</b> Walk to <b className="text-white">{shop?.name || 'the shop'}</b>{shop?.address ? ` — ${shop.address}` : ''}.</li>
          <li><b className="text-white">2.</b> Show pickup code <b className="font-mono text-white">{code}</b> at the counter.</li>
          <li><b className="text-white">3.</b> Collect once your order shows <b className="text-emerald-300">Completed</b> in tracking.</li>
        </ol>
        <p className="mt-2 flex items-start gap-1.5 text-[10.5px] text-ink-500"><Printer size={11} className="mt-0.5 shrink-0" /> Track live status below — the shop moves your job through queue → printing → completed.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }} className="mx-auto mt-5 flex max-w-sm flex-col gap-2">
        <Button className="w-full !py-3" onClick={onTrack}>Track my print <ArrowRight size={15} /></Button>
        <Button variant="secondary" className="w-full" onClick={onNewOrder}>Start another print</Button>
      </motion.div>
    </motion.div>
  )
}
