import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ScanLine, UploadCloud, SlidersHorizontal, ReceiptText, CreditCard, Printer,
  CheckCircle2, FileText, ShieldCheck, ChevronRight, MousePointerClick,
} from 'lucide-react'
import { Badge, Button, Card, SectionHeading } from './ui.jsx'
import { useData } from '../context/DataContext.jsx'

/**
 * "See the whole process" — an interactive, animated walkthrough of the real
 * guest flow. It uses the shop's live rates to price the example, so the numbers
 * shown are the numbers a customer would actually pay.
 */
export default function ProcessDemo() {
  const data = useData()
  const shops = data.shops()
  const shop = shops[0]
  const [step, setStep] = useState(0)
  const timer = useRef(null)

  const pricing = shop?.pricing || { bwSingle: 2, bwDouble: 1.5, colorSingle: 8, colorDouble: 6, binding: 20 }
  const pages = 24
  const copies = 2
  const sheets = Math.ceil(pages / 2)
  const printing = pricing.bwDouble * sheets * copies
  const binding = pricing.binding
  const total = printing + binding

  const STEPS = useMemo(() => [
    { icon: ScanLine, title: 'Scan the shop QR', desc: 'The shop page opens — no login, no app.', detail: shop ? `${shop.name} · ${shop.address}` : 'Shop identified automatically' },
    { icon: UploadCloud, title: 'Upload your PDF', desc: 'Tap to choose a file. Pages and size are read instantly.', detail: 'Data Structures — Unit 3.pdf · 24 pages · 1.8 MB' },
    { icon: SlidersHorizontal, title: 'Choose options', desc: 'Colour, sides, copies, pages, paper, binding.', detail: 'Black & white · Double-sided · 2 copies · A4' },
    { icon: ReceiptText, title: 'Review the price', desc: 'A clear breakdown before you pay anything.', detail: `₹${pricing.bwDouble} × ${sheets} sheets × ${copies} + ₹${binding} binding = ₹${total}` },
    { icon: CreditCard, title: 'Pay (demo)', desc: 'Demo payment is labelled TEST — no real money.', detail: 'TEST-XXXX · receipt saved · order stays pending' },
    { icon: Printer, title: 'Track & collect', desc: 'Order ID, live status, collect at the counter.', detail: 'Show #1042 at the counter when status = Completed' },
  ], [shop, pricing, sheets, copies, binding, total])

  const play = () => {
    setStep(0)
    clearInterval(timer.current)
    let i = 0
    timer.current = setInterval(() => {
      i += 1
      if (i >= STEPS.length) { clearInterval(timer.current); return }
      setStep(i)
    }, 1400)
  }

  const active = STEPS[step]
  const Icon = active.icon

  return (
    <section id="process" className="relative overflow-hidden py-20 sm:py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          center
          eyebrow="See it working"
          title="Scan → Upload → Options → Pay → Collect"
          subtitle="The whole journey, step by step. No account needed at any point."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          {/* phone mock */}
          <Card className="mx-auto w-full max-w-[360px] overflow-hidden p-0">
            <div className="flex items-center gap-1.5 border-b border-white/8 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-rose-400/70" /><span className="h-2 w-2 rounded-full bg-amber-400/70" /><span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              <span className="ml-2 rounded bg-white/5 px-2 py-0.5 text-[9px] text-ink-500">smartqrprint · /print</span>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-1">
                {STEPS.map((s, i) => (
                  <div key={s.title} className="flex flex-1 items-center gap-1">
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold ${i < step ? 'bg-emerald-400/20 text-emerald-300' : i === step ? 'bg-electric-500 text-white' : 'bg-white/8 text-ink-600'}`}>
                      {i < step ? <CheckCircle2 size={10} /> : i + 1}
                    </span>
                    {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? 'bg-emerald-400/40' : 'bg-white/10'}`} />}
                  </div>
                ))}
              </div>

              <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 min-h-[190px] rounded-xl border border-white/10 bg-navy-950/50 p-3.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-electric-400/12 text-electric-300 ring-1 ring-electric-400/25"><Icon size={18} /></span>
                <p className="mt-2.5 text-[13.5px] font-semibold text-white">{active.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">{active.desc}</p>

                <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-2">
                  {step === 1 ? (
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-rose-300" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-ink-100">Data Structures — Unit 3.pdf</p>
                        <p className="text-[9.5px] text-ink-500">24 pages · 1.8 MB</p>
                      </div>
                      <Badge tone="green">Ready</Badge>
                    </div>
                  ) : step === 3 || step === 4 ? (
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between"><span className="text-ink-400">Printing</span><span className="text-ink-100">₹{printing.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-ink-400">Binding</span><span className="text-ink-100">₹{binding.toFixed(2)}</span></div>
                      <div className="flex justify-between border-t border-white/8 pt-1"><span className="text-ink-300">Total</span><span className="font-bold text-white">₹{total.toFixed(2)}</span></div>
                      {step === 4 && <p className="pt-1 text-[9px] font-bold uppercase tracking-wide text-amber-300">TEST PAYMENT – NO REAL MONEY PAID</p>}
                    </div>
                  ) : step === 5 ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-ink-500">Order ID</p>
                        <p className="font-mono text-[13px] font-bold text-white">#1042</p>
                      </div>
                      <Badge tone="amber" dot>In queue</Badge>
                    </div>
                  ) : (
                    <p className="text-[10.5px] text-ink-400">{active.detail}</p>
                  )}
                </div>
              </motion.div>

              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
                <Button size="sm" className="flex-1" onClick={() => (step === STEPS.length - 1 ? play() : setStep((s) => s + 1))}>
                  {step === STEPS.length - 1 ? 'Replay' : 'Next step'} <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          </Card>

          {/* step list */}
          <div>
            <ol className="space-y-2">
              {STEPS.map((s, i) => {
                const done = i < step
                const now = i === step
                return (
                  <li key={s.title}>
                    <button
                      onClick={() => setStep(i)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${now ? 'border-electric-400/40 bg-electric-500/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${done ? 'bg-emerald-400/15 text-emerald-300' : now ? 'bg-electric-500 text-white' : 'bg-white/8 text-ink-500'}`}>
                        {done ? <CheckCircle2 size={13} /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-semibold ${now || done ? 'text-white' : 'text-ink-300'}`}>{s.title}</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">{s.desc}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ol>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button to="/print" size="md"><MousePointerClick size={14} /> Try it yourself — no login</Button>
              <Button onClick={play} variant="secondary" size="md">▶ Play walkthrough</Button>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-500">
              <ShieldCheck size={12} className="mt-0.5 shrink-0 text-emerald-400/80" />
              Prices come from {shop?.name || 'the shop'}’s live rates. Payment in this build is demo-only and clearly labelled; a print job is never released by a demo transaction.
            </p>
            <Link to="/shop/shop_vertex" className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-electric-300 hover:text-electric-200">
              See the page a scanned QR opens <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
