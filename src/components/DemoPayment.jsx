import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Smartphone, Building2, ShieldCheck, Lock, CheckCircle2, XCircle,
  Loader2, ArrowRight, RefreshCw, Fingerprint, ReceiptText, Printer,
} from 'lucide-react'
import { Badge, Button, Card } from './ui.jsx'
import { useToast } from './Toast.jsx'
import { fmtMoney, fmtDate } from '../lib/db.js'
import { runDemoPayment, livePaymentProvider, demoTxnOtp, demoCardFor } from '../lib/payments.js'

/**
 * Demo checkout — a realistic, clearly-labelled simulation.
 *
 * Nothing here can take money or release a print job. Every screen carries the
 * TEST banner; the flow deliberately mirrors a real gateway (method → details →
 * processing → result → receipt) so it can be used for training and demos.
 */

const BANNER = 'TEST PAYMENT – NO REAL MONEY PAID'

const METHODS = [
  { id: 'upi', label: 'UPI', hint: 'GPay · PhonePe · Paytm', icon: Smartphone },
  { id: 'card', label: 'Card', hint: 'Test card 4242…', icon: CreditCard },
  { id: 'netbanking', label: 'Net banking', hint: 'Simulated bank', icon: Building2 },
]

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra']

/* ------------------------------------------------------------- receipt ---- */

export function DemoReceipt({ tx, order, onClose }) {
  const toast = useToast()
  const success = tx.outcome === 'success'
  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-dashed border-amber-400/40 bg-amber-400/[0.06] px-3 py-2 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">{BANNER}</p>
        <p className="mt-0.5 text-[10px] text-amber-200/70">Demo receipt · no money was transferred · not a tax invoice</p>
      </div>

      <div className="overflow-hidden rounded-xl bg-white text-slate-900">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">SMART QR PRINT</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Demo payment receipt</p>
            </div>
            <span className={`rounded px-2 py-0.5 text-[9.5px] font-bold uppercase ${success ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-600'}`}>
              {success ? 'Demo complete' : 'Demo failed'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 p-4 text-[12px]">
          {[
            ['Transaction ID', tx.id],
            ['Order ID', `#${tx.orderRef}`],
            ['Document', tx.docName],
            ['Shop', tx.shopName || '—'],
            ['Method', tx.method],
            ['Date', fmtDate(tx.createdAt)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <span className="text-slate-500">{k}</span>
              <span className="max-w-[62%] truncate text-right font-medium">{v}</span>
            </div>
          ))}
          <div className="!mt-2 flex justify-between border-t border-slate-200 pt-2 text-[13px]">
            <span className="text-slate-500">Amount</span>
            <span className="font-bold">{fmtMoney(tx.amount)}</span>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
          <p className="text-center text-[9.5px] font-semibold uppercase tracking-wide text-amber-700">{BANNER}</p>
        </div>
      </div>

      {success ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3 text-[11.5px] leading-relaxed text-emerald-200">
          <p className="font-semibold">Demo payment simulated — the order stays “Payment pending”.</p>
          <p className="mt-1 text-emerald-200/80">A print job is only released by a verified live payment. Your shop will not print from this demo transaction.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-3 text-[11.5px] leading-relaxed text-rose-200">
          <p className="font-semibold">Demo failure: {tx.failureReason}</p>
          <p className="mt-1 text-rose-200/80">Nothing was charged and the order is unchanged. You can try again with another method.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer size={13} /> Print receipt</Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const text = `SMART QR PRINT — ${BANNER}\nTransaction: ${tx.id}\nOrder: #${tx.orderRef}\nAmount: ${fmtMoney(tx.amount)}\nResult: ${success ? 'demo complete' : 'demo failed'}\nThis is a test record. No money was paid.`
            navigator.clipboard?.writeText(text).then(() => toast('Receipt copied.', 'success')).catch(() => toast('Clipboard unavailable.', 'warning'))
          }}
        >
          Copy
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Done</Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ checkout ---- */

export default function DemoPayment({ order, onDemoResult, onClose }) {
  const toast = useToast()
  const [method, setMethod] = useState('upi')
  const [phase, setPhase] = useState('form') // form | processing | result
  const [step, setStep] = useState(0)
  const [outcome, setOutcome] = useState('success')
  const [tx, setTx] = useState(null)
  const [bank, setBank] = useState(BANKS[0])
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', exp: '12/30', cvv: '123' })
  const [upi, setUpi] = useState('student@okhdfcbank')
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const PROCESS_STEPS = {
    upi: ['Contacting the demo UPI app…', 'Collecting approval (simulated)…', 'Confirming with the shop…'],
    card: ['Securing the connection…', 'Checking the demo card…', 'Authorising with the bank (simulated)…'],
    netbanking: [`Redirecting to ${bank} (simulated)…`, 'Logging in (simulated)…', 'Approving the payment (simulated)…'],
  }

  const start = (choice) => {
    setOutcome(choice)
    setPhase('processing')
    setStep(0)
    timers.current.forEach(clearTimeout)
    timers.current = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => {
        const record = runDemoPayment({
          order,
          outcome: choice,
          method: method === 'card' ? `Card (demo) •••• ${card.number.slice(-4)}` : method === 'upi' ? `UPI (demo) ${upi}` : `Net banking (demo) ${bank}`,
          last4: method === 'card' ? card.number.slice(-4) : undefined,
        })
        setTx(record)
        setPhase('result')
        onDemoResult?.(record)
        if (choice === 'success') toast('Demo payment simulated. This is not a real payment.', 'info', { duration: 6000 })
        else toast('Demo payment failed (simulated). Nothing was charged.', 'warning', { duration: 6000 })
      }, 2200),
    ]
  }

  const reset = () => { setTx(null); setPhase('form'); setStep(0) }

  return (
    <div className="space-y-3">
      {/* persistent test banner */}
      <div className="rounded-xl border-2 border-dashed border-amber-400/40 bg-amber-400/[0.06] px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">{BANNER}</p>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-amber-200/75">
          Demo checkout. No card is charged, no UPI request is sent, and no print job is released.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'form' && (
          <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between rounded-lg border border-white/8 bg-navy-950/40 px-3 py-2">
                <div>
                  <p className="text-[10.5px] text-ink-500">Paying</p>
                  <p className="font-mono text-[12px] font-semibold text-white">#{order.id.replace('ord_', '')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] text-ink-500">Amount</p>
                  <p className="font-display text-lg font-bold text-white">{fmtMoney(order.amount)}</p>
                </div>
              </div>

              <p className="mt-3 text-[12px] font-medium text-ink-300">Choose a demo method</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {METHODS.map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)} className={`rounded-xl border p-2.5 text-center transition-colors ${method === m.id ? 'border-electric-400/50 bg-electric-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}>
                    <m.icon size={15} className={method === m.id ? 'mx-auto text-electric-300' : 'mx-auto text-ink-400'} />
                    <p className="mt-1 text-[11px] font-semibold text-white">{m.label}</p>
                    <p className="text-[9px] text-ink-500">{m.hint}</p>
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-white/8 bg-navy-950/40 p-3">
                {method === 'upi' && (
                  <label className="block">
                    <span className="text-[11px] text-ink-400">Demo UPI ID</span>
                    <input value={upi} onChange={(e) => setUpi(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-navy-950/60 px-2.5 py-2 text-[12.5px] text-ink-100 outline-none focus:border-electric-400/60" />
                    <span className="mt-1 block text-[9.5px] text-ink-600">Any text works — nothing is sent to a UPI app.</span>
                  </label>
                )}
                {method === 'card' && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="col-span-2 block">
                      <span className="text-[11px] text-ink-400">Card number</span>
                      <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-navy-950/60 px-2.5 py-2 font-mono text-[12.5px] text-ink-100 outline-none focus:border-electric-400/60" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-ink-400">Expiry</span>
                      <input value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-navy-950/60 px-2.5 py-2 text-[12.5px] text-ink-100 outline-none focus:border-electric-400/60" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-ink-400">CVV</span>
                      <input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-navy-950/60 px-2.5 py-2 text-[12.5px] text-ink-100 outline-none focus:border-electric-400/60" />
                    </label>
                    <p className="col-span-2 text-[9.5px] text-ink-600">Test card only. Never type a real card number here.</p>
                  </div>
                )}
                {method === 'netbanking' && (
                  <label className="block">
                    <span className="text-[11px] text-ink-400">Bank</span>
                    <select value={bank} onChange={(e) => setBank(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-navy-950/60 px-2.5 py-2 text-[12.5px] text-ink-100 outline-none">
                      {BANKS.map((b) => <option key={b} className="bg-navy-900">{b}</option>)}
                    </select>
                  </label>
                )}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button onClick={() => start('success')}><CheckCircle2 size={14} /> Simulate success</Button>
                <Button variant="danger" onClick={() => start('declined')}><XCircle size={14} /> Simulate failure</Button>
              </div>
              <button onClick={onClose} className="mt-2 w-full text-[11px] text-ink-500 hover:text-ink-200">Back to order</button>
            </Card>
          </motion.div>
        )}

        {phase === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="p-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-amber-400/30 bg-amber-400/10">
                <Loader2 size={22} className="animate-spin text-amber-300" />
              </div>
              <p className="mt-4 text-[13.5px] font-semibold text-white">Processing demo payment…</p>
              <div className="mx-auto mt-4 max-w-[260px] space-y-2 text-left">
                {(PROCESS_STEPS[method] || []).map((label, i) => (
                  <div key={label} className="flex items-center gap-2 text-[11.5px]">
                    {step > i ? <CheckCircle2 size={12} className="text-emerald-400" /> : step === i ? <Loader2 size={12} className="animate-spin text-electric-300" /> : <span className="h-3 w-3 rounded-full border border-white/20" />}
                    <span className={step >= i ? 'text-ink-200' : 'text-ink-600'}>{label}</span>
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-4 h-1 w-44 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full bg-amber-400" initial={{ width: '0%' }} animate={{ width: `${((step + 1) / 3) * 100}%` }} transition={{ duration: 0.6 }} />
              </div>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] text-amber-300/70"><Lock size={9} /> {BANNER}</p>
            </Card>
          </motion.div>
        )}

        {phase === 'result' && tx && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <div className={`mb-3 flex items-center gap-3 rounded-xl border p-3 ${tx.outcome === 'success' ? 'border-emerald-400/25 bg-emerald-400/[0.06]' : 'border-rose-400/25 bg-rose-400/[0.06]'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tx.outcome === 'success' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>
                {tx.outcome === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white">{tx.outcome === 'success' ? 'Demo payment simulated' : 'Demo payment failed'}</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-ink-400">{tx.id} · OTP {demoTxnOtp(tx.id)}</p>
                {method === 'card' && <p className="text-[10px] text-ink-600">card {demoCardFor(tx.id)}</p>}
              </div>
              <Badge tone={tx.outcome === 'success' ? 'slate' : 'red'}>TEST</Badge>
            </div>
            <DemoReceipt tx={tx} order={order} onClose={onClose} />
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={reset}><RefreshCw size={12} /> Try another method</Button>
              <Button size="sm" variant="ghost" onClick={onClose}><ArrowRight size={12} /> Back to order</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5 text-[10.5px] leading-relaxed text-ink-500">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink-300"><ShieldCheck size={11} className="text-emerald-400" /> Live payments:</span>{' '}
        {livePaymentProvider.configured
          ? `${livePaymentProvider.provider} is configured — real checkout is available from the order page.`
          : 'not configured. Demo records are kept apart from real payments and are never sent to the shop as a paid order.'}
      </div>
    </div>
  )
}
