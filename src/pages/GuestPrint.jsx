import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  UploadCloud, FileText, ScanLine, ChevronLeft, ChevronRight, Settings2, ReceiptText,
  CreditCard, Printer, CheckCircle2, Trash2, RefreshCw, ShieldCheck, Clock, MapPin,
  LogIn, Store, FlaskConical, Copy, Loader2, Pencil,
} from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { Badge, Button, Card, Input, IntegrationNote, Modal, SegmentedControl, Toggle } from '../components/ui.jsx'
import ShopQrScanner from '../components/ShopQrScanner.jsx'
import DemoPayment from '../components/DemoPayment.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useGuest } from '../context/GuestContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { fmtMoney, fmtDate, STAGE_LABELS, ORDER_STAGES } from '../lib/db.js'
import { calculatePrice, parsePageRanges, PAPER_SIZES } from '../lib/pricing.js'
import { safePageCount } from '../lib/pdfPages.js'
import LivePayment, { CheckoutSuccess } from '../components/LivePayment.jsx'
import { demoTransactions } from '../lib/payments.js'

const STEPS = [
  { id: 1, label: 'Shop', icon: Store },
  { id: 2, label: 'Upload', icon: UploadCloud },
  { id: 3, label: 'Options', icon: Settings2 },
  { id: 4, label: 'Review', icon: ReceiptText },
  { id: 5, label: 'Pay', icon: CreditCard },
  { id: 6, label: 'Done', icon: Printer },
]

const fmtSize = (b) => (!b ? '—' : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function StepBar({ step, go }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const active = step === s.id
        const done = step > s.id
        return (
          <div key={s.id} className="flex flex-1 items-center gap-1">
            <button
              onClick={() => s.id < step && go(s.id)}
              disabled={s.id > step}
              aria-current={active ? 'step' : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${active ? 'bg-electric-500/20 text-white ring-1 ring-electric-400/40' : done ? 'text-emerald-300' : 'text-ink-600'}`}
            >
              <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] ${active ? 'bg-electric-500 text-white' : done ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/8 text-ink-500'}`}>
                {done ? <CheckCircle2 size={9} /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <span className={`h-px w-2 shrink-0 ${done ? 'bg-emerald-400/40' : 'bg-white/10'}`} />}
          </div>
        )
      })}
    </div>
  )
}

export default function GuestPrint() {
  const [params, setParams] = useSearchParams()
  const data = useData()
  const { user } = useAuth()
  const { guestId } = useGuest()
  const toast = useToast()
  const shops = data.shops()

  const [step, setStep] = useState(1)
  const [shopId, setShopId] = useState(params.get('shop') || '')
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [drag, setDrag] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [reading, setReading] = useState(false)
  const [rangeInput, setRangeInput] = useState('')
  const [copies, setCopies] = useState(1)
  const [color, setColor] = useState(false)
  const [duplex, setDuplex] = useState(false)
  const [paper, setPaper] = useState('A4')
  const [binding, setBinding] = useState(false)
  const [rotate, setRotate] = useState(0)
  const [scanOpen, setScanOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [order, setOrder] = useState(null)
  const [demoTx, setDemoTx] = useState(null)
  const [paid, setPaid] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [retentionAck, setRetentionAck] = useState(false)
  const fileRef = useRef(null)

  const shop = shops.find((s) => s.id === shopId)
  const selectedPages = useMemo(() => parsePageRanges(rangeInput, pageCount || 1), [rangeInput, pageCount])
  const price = useMemo(
    () => calculatePrice({ pages: selectedPages.length, copies, color, duplex, paper, binding, pricing: shop?.pricing }),
    [selectedPages.length, copies, color, duplex, paper, binding, shop],
  )

  useEffect(() => {
    if (shopId) setParams({ shop: shopId }, { replace: true })
  }, [shopId, setParams])

  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl) }, [fileUrl])

  const go = (n) => { setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const onFile = async (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) return toast('Please choose a PDF file.', 'warning')
    if (f.size > 25 * 1024 * 1024) return toast('This file is over the 25 MB limit.', 'error')
    setReading(true)
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    const url = URL.createObjectURL(f)
    setFile(f); setFileUrl(url); setRangeInput(''); setPageCount(0)
    // Trust the browser's own PDF engine, not byte-scanning — counts every
    // page of files of any size, including compressed PDFs.
    safePageCount(f).then((n) => {
      setPageCount(n)
      toast(`PDF ready — ${n} pages detected. Print all or pick ranges.`, 'success')
      setReading(false)
      go(3)
    }).catch(() => {
      setPageCount(1)
      setReading(false)
      go(3)
    })
  }

  const clearFile = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFile(null); setFileUrl(''); setPageCount(0); setRangeInput('')
  }

  const createOrder = () => {
    if (!retentionAck) return toast('Please tick the file-retention note first.', 'warning')
    const existing = data.orders().find((o) => o.status !== 'cancelled' && o.docName === file?.name && o.amount === price.total && o.shopId === shopId && Date.now() - new Date(o.createdAt).getTime() < 10 * 60 * 1000)
    if (existing) {
      toast('You already placed this exact order a moment ago.', 'warning')
      setOrder(existing)
      go(6)
      return
    }
    const rec = data.createOrder({
      shopId,
      docName: file?.name || 'Untitled document',
      pages: selectedPages.length,
      pageRange: rangeInput || `1-${selectedPages.length}`,
      copies, color, duplex, paper, binding,
      amount: price.total,
      status: 'payment_pending',
      sizeBytes: file?.size || 0,
      expiresAt: new Date(Date.now() + (shop?.retentionHours || 24) * 3600 * 1000).toISOString(),
    })
    setOrder(rec)
    go(5)
  }

  const onDemoResult = (tx) => {
    setDemoTx(tx)
    data.logEvent(order.id, order.status, `Demo payment ${tx.outcome === 'success' ? 'simulated as successful' : 'simulated as failed'} (${tx.id}) — not a real payment; order unchanged`)
  }

  const cancelOrder = () => {
    data.advanceOrder(order.id, 'cancelled', 'Cancelled by customer before printing')
    setOrder({ ...order, status: 'cancelled' })
    toast('Order cancelled.', 'info')
  }

  const canCancel = order && ['payment_pending', 'payment_verified', 'in_queue'].includes(order.status)

  /** Called only from Razorpay's own success handler — never simulated. */
  const onLiveVerified = (rcpt) => {
    const mode = (import.meta.env.VITE_RAZORPAY_KEY_ID || '').startsWith('rzp_live') ? 'live' : 'test'
    data.setOrder(order.id, {
      payment: {
        provider: 'razorpay',
        ref: rcpt.razorpayPaymentId || rcpt.id,
        razorpayOrderId: rcpt.razorpayOrderId || '',
        method: rcpt.method,
        testMode: mode !== 'live',
        verifiedAt: new Date().toISOString(),
      },
    })
    data.advanceOrder(order.id, 'payment_verified', `Payment verified via Razorpay (${rcpt.razorpayPaymentId || rcpt.id}) — job released to the shop`)
    setOrder({ ...order, status: 'payment_verified' })
    setReceipt(rcpt)
    setPaid(true)
    toast('Payment successful! Your print job is now with the shop.', 'success')
  }

  const startFresh = () => { setOrder(null); setPaid(false); setReceipt(null); setDemoTx(null); clearFile(); go(2) }

  return (
    <div className="min-h-screen">
      {/* slim header — no dashboard chrome, guest friendly */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-navy-900/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/"><Logo size="sm" /></Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/app" className="text-[12px] font-medium text-electric-300 hover:text-electric-200">My account</Link>
            ) : (
              <>
                <span className="hidden text-[11px] text-ink-500 sm:inline">Guest checkout</span>
                <Link to="/login" className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-300 hover:text-white"><LogIn size={12} /> Sign in</Link>
              </>
            )}
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-2"><StepBar step={step} go={go} /></div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {/* 1 · shop */}
            {step === 1 && (
              <div className="space-y-3">
                <Card className="p-4">
                  <h1 className="text-[15px] font-semibold text-white">Where are you printing?</h1>
                  <p className="mt-1 text-[12px] text-ink-400">Scan the QR at the counter, or pick the shop below.</p>
                  <Button className="mt-3 w-full !py-3.5" onClick={() => setScanOpen(true)}>
                    <ScanLine size={17} /> Scan shop QR
                  </Button>
                </Card>

                <div className="space-y-2">
                  {shops.map((s) => {
                    const printers = data.printers(s.id)
                    const online = printers.filter((p) => p.status === 'online').length
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setShopId(s.id); go(2) }}
                        className={`w-full rounded-xl border p-3.5 text-left transition-colors ${shopId === s.id ? 'border-electric-400/50 bg-electric-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] ring-1 ring-white/10"><Store size={15} className="text-electric-300" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-white">{s.name}</p>
                            <p className="truncate text-[11px] text-ink-500"><MapPin size={9} className="mr-1 inline" />{s.address}</p>
                          </div>
                          <Badge tone={s.open ? 'green' : 'slate'} dot>{s.open ? 'Open' : 'Closed'}</Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-[10.5px] text-ink-500">
                          <span className="inline-flex items-center gap-1"><Printer size={10} /> {online}/{printers.length} printers</span>
                          <span className="inline-flex items-center gap-1"><Clock size={10} /> {s.hours}</span>
                          <span className="ml-auto text-ink-400">from ₹{s.pricing.bwSingle}/page</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2 · upload */}
            {step === 2 && (
              <div className="space-y-3">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <h1 className="text-[15px] font-semibold text-white">Upload your PDF</h1>
                    <Badge tone="blue">{shop?.name}</Badge>
                  </div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]) }}
                    onClick={() => fileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                    className={`mt-3 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed py-12 text-center transition-colors ${drag ? 'border-electric-400/60 bg-electric-500/10' : 'border-white/12 bg-navy-950/40 hover:border-electric-400/40'}`}
                  >
                    <div>
                      {reading ? <Loader2 size={24} className="mx-auto animate-spin text-electric-300" /> : <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-electric-400/10 text-electric-300 ring-1 ring-electric-400/25"><UploadCloud size={22} /></span>}
                      <p className="mt-3 text-[13.5px] font-semibold text-white">{reading ? 'Reading your PDF…' : 'Tap to choose a PDF'}</p>
                      <p className="mt-1 text-[11px] text-ink-500">PDF · up to 25 MB · deleted after {shop?.retentionHours || 24}h</p>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                  {file && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                      <FileText size={15} className="shrink-0 text-rose-300" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-ink-100">{file.name}</p>
                        <p className="text-[10.5px] text-ink-500">{pageCount} pages · {fmtSize(file.size)}</p>
                      </div>
                      <button onClick={clearFile} className="rounded-md p-1.5 text-ink-400 hover:bg-rose-500/15 hover:text-rose-300" aria-label="Remove file"><Trash2 size={13} /></button>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => go(1)}><ChevronLeft size={13} /> Shop</Button>
                    {file && pageCount > 0 && <Button size="sm" className="flex-1" onClick={() => go(3)}>Continue <ChevronRight size={13} /></Button>}
                  </div>
                </Card>
              </div>
            )}

            {/* 3 · options + preview */}
            {step === 3 && (
              <div className="space-y-3">
                <Card className="p-3">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <h1 className="text-[15px] font-semibold text-white">Preview &amp; options</h1>
                    <div className="flex gap-1">
                      <button onClick={() => setRotate((r) => (r + 90) % 360)} className="rounded-md p-1.5 text-ink-400 hover:bg-white/8 hover:text-white" aria-label="Rotate preview"><RefreshCw size={13} /></button>
                      <button onClick={() => { clearFile(); go(2) }} className="rounded-md p-1.5 text-ink-400 hover:bg-rose-500/15 hover:text-rose-300" aria-label="Replace file"><Pencil size={13} /></button>
                    </div>
                  </div>
                  <object data={`${fileUrl}#page=1&zoom=page-width&toolbar=0`} type="application/pdf" className="h-[300px] w-full rounded-lg bg-white/95" style={{ transform: `rotate(${rotate}deg)` }} aria-label="PDF preview">
                    <div className="grid h-full place-items-center text-[12px] text-ink-500">
                      <span>Preview not supported here. <a href={fileUrl} target="_blank" rel="noreferrer" className="text-electric-300 underline">Open the PDF</a></span>
                    </div>
                  </object>
                  <p className="mt-2 flex items-center justify-between px-1 text-[10.5px] text-ink-500">
                    <span>{file?.name}</span>
                    <span>{pageCount} pages · {fmtSize(file?.size)}</span>
                  </p>
                </Card>

                <Card className="space-y-4 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-[12px] font-medium text-ink-300">Colour</p>
                      <SegmentedControl className="w-full [&>button]:flex-1" options={[{ value: 'bw', label: 'B&W' }, { value: 'color', label: 'Colour' }]} value={color ? 'color' : 'bw'} onChange={(v) => setColor(v === 'color')} />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[12px] font-medium text-ink-300">Sides</p>
                      <SegmentedControl className="w-full [&>button]:flex-1" options={[{ value: 'single', label: 'Single' }, { value: 'double', label: 'Double' }]} value={duplex ? 'double' : 'single'} onChange={(v) => setDuplex(v === 'double')} />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[12px] font-medium text-ink-300">Copies</p>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setCopies((c) => Math.max(1, c - 1))} aria-label="Fewer copies">−</Button>
                        <span className="w-8 text-center text-[14px] font-semibold text-white">{copies}</span>
                        <Button variant="secondary" size="sm" onClick={() => setCopies((c) => Math.min(100, c + 1))} aria-label="More copies">+</Button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="paper" className="mb-1.5 block text-[12px] font-medium text-ink-300">Paper</label>
                      <select id="paper" value={paper} onChange={(e) => setPaper(e.target.value)} className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2 text-[13px] text-ink-100 outline-none focus:border-electric-400/60">
                        {PAPER_SIZES.map((p) => <option key={p.id} value={p.id} className="bg-navy-900">{p.id}</option>)}
                      </select>
                    </div>
                  </div>
                  <Input label={`Pages (blank = all ${pageCount || '…'} — no cap)`} placeholder="e.g. 1-5, 8" value={rangeInput} onChange={(e) => setRangeInput(e.target.value)} />
                  <Toggle checked={binding} onChange={setBinding} label={`Spiral binding (₹${shop?.pricing?.binding ?? 15} per copy)`} />
                </Card>

                <Card className="p-4">
                  <div className="space-y-1.5 text-[12px]">
                    <div className="flex justify-between"><span className="text-ink-400">Selected pages</span><span className="text-ink-100">{selectedPages.length}</span></div>
                    <div className="flex justify-between"><span className="text-ink-400">Sheets × copies</span><span className="text-ink-100">{price.sheets} × {copies}</span></div>
                    <div className="flex justify-between"><span className="text-ink-400">Printing</span><span className="text-ink-100">{fmtMoney(price.printing)}</span></div>
                    {price.binding > 0 && <div className="flex justify-between"><span className="text-ink-400">Binding</span><span className="text-ink-100">{fmtMoney(price.binding)}</span></div>}
                    <div className="!mt-2.5 flex items-center justify-between border-t border-white/8 pt-2.5">
                      <span className="text-ink-300">Total</span>
                      <span className="font-display text-xl font-bold text-white">{fmtMoney(price.total)}</span>
                    </div>
                  </div>
                  <Button className="mt-3 w-full !py-3.5" onClick={() => go(4)}>Review order <ChevronRight size={15} /></Button>
                </Card>
              </div>
            )}

            {/* 4 · review */}
            {step === 4 && (
              <div className="space-y-3">
                <Card className="p-4">
                  <h1 className="text-[15px] font-semibold text-white">Review your order</h1>
                  <div className="mt-3 space-y-2 text-[12.5px]">
                    {[
                      ['Shop', shop?.name],
                      ['Document', file?.name],
                      ['Pages', `${rangeInput || `1-${pageCount}`} (${selectedPages.length})`],
                      ['Copies', copies],
                      ['Colour', color ? 'Colour' : 'Black & white'],
                      ['Sides', duplex ? 'Double-sided' : 'Single-sided'],
                      ['Paper', paper],
                      ['Binding', binding ? 'Spiral' : 'None'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4"><span className="text-ink-400">{k}</span><span className="max-w-[60%] truncate text-right font-medium text-ink-100">{v}</span></div>
                    ))}
                    <div className="!mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                      <span className="text-ink-300">Total payable</span>
                      <span className="font-display text-xl font-bold text-white">{fmtMoney(price.total)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => go(3)}><ChevronLeft size={13} /> Edit options</Button>
                    <Button variant="ghost" size="sm" onClick={() => { clearFile(); go(2) }}><Trash2 size={13} /> Replace file</Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <label className="flex items-start gap-2.5 text-[11.5px] leading-relaxed text-ink-400">
                    <input type="checkbox" checked={retentionAck} onChange={(e) => setRetentionAck(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-electric-500" />
                    <span><ShieldCheck size={12} className="mr-1 inline text-emerald-400" /> My file is stored temporarily and deleted {shop?.retentionHours || 24} hours after upload. My order record is kept.</span>
                  </label>
                  <Button className="mt-3 w-full !py-3.5" onClick={createOrder} disabled={!retentionAck}>Place order &amp; pay <ChevronRight size={15} /></Button>
                  {!user && <p className="mt-2 text-center text-[10.5px] text-ink-600">Ordering as a guest — no account needed.</p>}
                </Card>
              </div>
            )}

            {/* 5 · pay */}
            {step === 5 && order && !paid && (
              <div className="space-y-3">
                <LivePayment
                  order={order}
                  shopName={shop?.name}
                  compact
                  onVerified={onLiveVerified}
                />
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-ink-500">Order</p>
                      <p className="font-mono text-[13px] font-semibold text-white">#{order.id.replace('ord_', '')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-ink-500">Amount</p>
                      <p className="font-display text-xl font-bold text-white">{fmtMoney(order.amount)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button variant="secondary" className="w-full" onClick={() => setDemoOpen(true)}><FlaskConical size={14} /> Rehearse with demo payment</Button>
                  </div>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-ink-600">Demo is TEST MODE — no money moves and no job is released.</p>
                  {canCancel && <button onClick={cancelOrder} className="mt-3 text-[11.5px] text-rose-300 hover:text-rose-200">Cancel this order</button>}
                </Card>
                <Button variant="secondary" size="sm" className="w-full" onClick={() => go(6)}>See order status <ChevronRight size={13} /></Button>
              </div>
            )}

            {/* 5b · payment success celebration */}
            {step === 5 && order && paid && receipt && (
              <CheckoutSuccess
                receipt={receipt}
                order={{ ...order, status: 'payment_verified' }}
                shop={shop}
                onTrack={() => go(6)}
                onNewOrder={startFresh}
              />
            )}

            {/* 6 · status + receipt */}
            {step === 6 && order && (
              <div className="space-y-3">
                <Card className="p-4 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25"><CheckCircle2 size={22} /></span>
                  <h1 className="mt-3 text-[15px] font-semibold text-white">Order placed</h1>
                  <p className="mt-1 text-[12px] text-ink-400">Show this ID at the counter to collect your printout.</p>
                  <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-navy-950/50 px-3 py-2.5">
                    <span className="font-mono text-[15px] font-bold tracking-wider text-white">#{order.id.replace('ord_', '')}</span>
                    <button onClick={() => navigator.clipboard?.writeText(order.id.replace('ord_', '')).then(() => toast('Order ID copied.', 'success')).catch(() => {})} className="text-ink-400 hover:text-white" aria-label="Copy order ID"><Copy size={13} /></button>
                  </div>
                  <Badge tone={order.status === 'failed' ? 'red' : order.status === 'completed' ? 'green' : 'amber'} className="mt-3" dot>{STAGE_LABELS[order.status]}</Badge>
                </Card>

                <Card className="p-4">
                  <h2 className="text-[13px] font-semibold text-white">Status</h2>
                  <ol className="mt-3 space-y-0">
                    {ORDER_STAGES.map((s, i) => {
                      const idx = ORDER_STAGES.indexOf(order.status)
                      const done = idx >= i && !['failed', 'cancelled'].includes(order.status)
                      return (
                        <li key={s} className="flex gap-2.5">
                          <div className="flex flex-col items-center">
                            <span className={`grid h-5 w-5 place-items-center rounded-full text-[9px] ${done ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/8 text-ink-600'}`}>{done ? <CheckCircle2 size={10} /> : i + 1}</span>
                            {i < ORDER_STAGES.length - 1 && <span className={`my-0.5 h-4 w-px ${done ? 'bg-emerald-400/40' : 'bg-white/10'}`} />}
                          </div>
                          <p className={`pb-1 text-[12px] ${done ? 'text-ink-100' : 'text-ink-600'}`}>{STAGE_LABELS[s]}</p>
                        </li>
                      )
                    })}
                  </ol>
                  {order.status === 'failed' && <p className="mt-2 rounded-lg border border-rose-400/25 bg-rose-400/5 px-2.5 py-1.5 text-[11px] text-rose-200">Failed: {order.failureReason || 'reported by the shop'}</p>}
                </Card>

                <Card className="p-4">
                  <h2 className="text-[13px] font-semibold text-white">Collect your printout</h2>
                  <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-ink-400">
                    <li>1. Go to <b className="text-ink-100">{shop?.name}</b>{shop?.address ? ` — ${shop.address}` : ''}.</li>
                    <li>2. Show order ID <b className="text-ink-100">#{order.id.replace('ord_', '')}</b> at the counter.</li>
                    <li>3. Collect once the status shows <b className="text-ink-100">Completed</b>.</li>
                  </ul>
                </Card>

                <div className="flex flex-col gap-2">
                  <Button to="/orders" variant="secondary">Track / view receipt</Button>
                  <Button to="/print" variant="ghost">Start another print</Button>
                  {!user && <Link to="/signup" className="text-center text-[11.5px] text-electric-300 hover:text-electric-200">Create an account to keep your order history</Link>}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <ShopQrScanner open={scanOpen} onClose={() => setScanOpen(false)} onConfirm={(id) => { setShopId(id); setScanOpen(false); go(2) }} />

      <Modal open={demoOpen} onClose={() => setDemoOpen(false)} title="Demo payment" wide>
        {order && (
          <DemoPayment order={{ ...order, shopName: shop?.name }} onDemoResult={onDemoResult} onClose={() => { setDemoOpen(false); go(6) }} />
        )}
      </Modal>

    </div>
  )
}
