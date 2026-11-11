import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ScanLine, UploadCloud, FileText, ChevronRight, ChevronLeft, Settings2, ReceiptText,
  CreditCard, CheckCircle2, X, Loader2, QrCode, Copy, Printer, Clock, ShieldCheck,
  AlertTriangle, Trash2, RefreshCw, Store, FlaskConical,
} from 'lucide-react'
import { Badge, Button, Card, Input, IntegrationNote, Modal, SegmentedControl, Toggle } from '../../components/ui.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { fmtMoney, fmtDate, STAGE_LABELS, ORDER_STAGES } from '../../lib/db.js'
import DemoPayment from '../../components/DemoPayment.jsx'
import ShopQrScanner from '../../components/ShopQrScanner.jsx'
import { demoTransactions } from '../../lib/payments.js'
import { calculatePrice, parsePageRanges, PAPER_SIZES } from '../../lib/pricing.js'

const STEPS = [
  { id: 1, label: 'Shop', icon: ScanLine },
  { id: 2, label: 'Upload', icon: UploadCloud },
  { id: 3, label: 'Preview', icon: FileText },
  { id: 4, label: 'Options', icon: Settings2 },
  { id: 5, label: 'Summary', icon: ReceiptText },
  { id: 6, label: 'Payment', icon: CreditCard },
  { id: 7, label: 'Track', icon: Printer },
]

function Stepper({ step, go }) {
  return (
    <div className="no-print overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1.5">
        {STEPS.map((s, i) => {
          const active = step === s.id
          const done = step > s.id
          return (
            <li key={s.id} className="flex items-center gap-1.5">
              <button
                onClick={() => s.id < step && go(s.id)}
                disabled={s.id > step}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] font-medium transition-colors ${active ? 'bg-electric-500/15 text-white ring-1 ring-electric-400/35' : done ? 'text-emerald-300 hover:bg-white/5' : 'text-ink-600'}`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${active ? 'bg-electric-500 text-white' : done ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/6 text-ink-500'}`}>
                  {done ? <CheckCircle2 size={11} /> : s.id}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={13} className={done ? 'text-emerald-400/60' : 'text-ink-700'} />}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ------------------------------ PDF preview ------------------------------ */

function PdfPreview({ fileUrl, name, pageCount, selected, rotate }) {
  if (!fileUrl) {
    return (
      <div className="grid h-[380px] place-items-center rounded-xl border border-dashed border-white/12 bg-navy-950/40 text-center">
        <div>
          <FileText size={28} className="mx-auto text-ink-600" />
          <p className="mt-2 text-[12.5px] text-ink-500">Preview appears here after you upload a PDF.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-navy-950/50">
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <p className="truncate text-[12px] font-medium text-ink-100">{name}</p>
        <span className="shrink-0 text-[11px] text-ink-500">{pageCount} page{pageCount > 1 ? 's' : ''} · showing {selected.length}</span>
      </div>
      <object
        data={`${fileUrl}#page=1&zoom=page-width&toolbar=0`}
        type="application/pdf"
        className="h-[360px] w-full bg-white/95"
        style={{ transform: `rotate(${rotate}deg)` }}
        aria-label={`Preview of ${name}`}
      >
        <div className="p-6 text-center text-[12px] text-ink-500">
          Your browser cannot embed this PDF. <a href={fileUrl} target="_blank" rel="noreferrer" className="text-electric-300 underline">Open it in a new tab</a>.
        </div>
      </object>
      <p className="border-t border-white/8 px-3 py-1.5 text-[10.5px] text-ink-600">Rendered by your browser’s built-in PDF viewer — no page images are generated server-side.</p>
    </div>
  )
}

/* ------------------------------- Shop picker ------------------------------ */

function ShopStep({ shops, shopId, setShopId, go }) {
  const data = useData()
  const [manual, setManual] = useState('')
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-xl border border-electric-400/20 bg-electric-400/[0.05] p-4 sm:flex-row sm:items-center">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-electric-400/15 text-electric-300 ring-1 ring-electric-400/30"><QrCode size={18} /></span>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-white">Scanned a QR at the counter?</p>
          <p className="mt-0.5 text-[11.5px] text-ink-400">The shop is selected automatically. You can also pick one below or paste a shop ID.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {shops.map((s) => {
          const printers = data.printers(s.id)
          const online = printers.filter((p) => p.status === 'online').length
          return (
            <button
              key={s.id}
              onClick={() => { setShopId(s.id); go(2) }}
              className={`rounded-xl border p-4 text-left transition-all ${shopId === s.id ? 'border-electric-400/50 bg-electric-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] ring-1 ring-white/10"><Store size={15} className="text-electric-300" /></span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{s.name}</p>
                    <p className="text-[11px] text-ink-500">{s.address}</p>
                  </div>
                </div>
                <Badge tone={s.open ? 'green' : 'slate'} dot>{s.open ? 'Open' : 'Closed'}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-400">
                <span className="inline-flex items-center gap-1"><Printer size={11} /> {online}/{printers.length} printers</span>
                <span className="inline-flex items-center gap-1"><Clock size={11} /> {s.hours}</span>
                {s.rating && <span className="inline-flex items-center gap-1 text-amber-300">★ {s.rating}</span>}
              </div>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="mb-2 text-[12px] font-medium text-ink-300">Or enter a shop ID from a QR link</p>
        <div className="flex gap-2">
          <Input placeholder="shop_vertex" value={manual} onChange={(e) => setManual(e.target.value)} className="flex-1" />
          <Button variant="secondary" onClick={() => { if (shops.find((s) => s.id === manual.trim())) { setShopId(manual.trim()); go(2) } else { go(1) } }}>Use shop</Button>
        </div>
        <p className="mt-2 text-[10.5px] text-ink-600">Example: shop_vertex</p>
      </div>
    </div>
  )
}

/* --------------------------------- Page --------------------------------- */

export default function Print() {
  const [params, setParams] = useSearchParams()
  const data = useData()
  const { user } = useAuth()
  const toast = useToast()
  const shops = data.shops()
  const [step, setStep] = useState(1)
  const [shopId, setShopId] = useState(params.get('shop') || shops[0]?.id || '')
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [drag, setDrag] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [rangeInput, setRangeInput] = useState('')
  const [copies, setCopies] = useState(1)
  const [color, setColor] = useState(false)
  const [duplex, setDuplex] = useState(false)
  const [paper, setPaper] = useState('A4')
  const [binding, setBinding] = useState(false)
  const [rotate, setRotate] = useState(0)
  const [paying, setPaying] = useState(false)
  const [order, setOrder] = useState(null)
  const [retentionAck, setRetentionAck] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoTx, setDemoTx] = useState(null)
  const [scanOpen, setScanOpen] = useState(false)
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

  const onFile = async (f) => {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      toast('Please choose a PDF file. Other formats are not supported yet.', 'warning')
      return
    }
    if (f.size > 25 * 1024 * 1024) {
      toast('This file is over the 25 MB upload limit.', 'error')
      return
    }
    const url = URL.createObjectURL(f)
    setFile(f)
    setFileUrl(url)
    setRangeInput('')
    // Determine a real page count where the browser allows it.
    try {
      const buf = await f.slice(0, 4_000_000).arrayBuffer()
      const text = new TextDecoder('latin1').decode(buf)
      const matches = [...text.matchAll(/\/Type\s*\/Page[^s]/g)]
      const count = matches.length || null
      if (count) setPageCount(count)
      else {
        const m = text.match(/\/Count\s+(\d+)/)
        setPageCount(m ? Number(m[1]) : 1)
      }
    } catch {
      setPageCount(1)
    }
    setStep(3)
    toast('File attached. Set your options next.', 'success')
  }

  const clearFile = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFile(null); setFileUrl(''); setPageCount(0); setRangeInput(''); setStep(2)
  }

  const go = (s) => setStep(s)

  const createOrder = () => {
    if (!retentionAck) return toast('Please acknowledge the retention policy first.', 'warning')
    const existing = data.orders().find(
      (o) => o.status !== 'cancelled' && o.docName === file?.name && o.amount === price.total && o.shopId === shopId && Date.now() - new Date(o.createdAt).getTime() < 10 * 60 * 1000,
    )
    if (existing) {
      toast('An identical order was created moments ago. Duplicate order prevented.', 'warning')
      setOrder(existing)
      setStep(7)
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
    })
    data.addDocument({
      name: file?.name || 'Untitled document',
      size: file?.size || 0,
      pages: pageCount,
      kind: 'pdf',
      source: 'upload',
      expiresAt: new Date(Date.now() + (shop?.retentionHours || 24) * 3600 * 1000).toISOString(),
    })
    setOrder(rec)
    setStep(6)
  }

  const payNow = async () => {
    setPaying(true)
    await new Promise((r) => setTimeout(r, 900))
    setPaying(false)
    toast('Payment gateway is not configured in this build. The order stays at “Payment pending”.', 'warning', { duration: 6000 })
  }

  const onDemoResult = (tx) => {
    setDemoTx(tx)
    data.logEvent(order.id, order.status, `Demo payment ${tx.outcome === 'success' ? 'simulated as successful' : 'simulated as failed'} (${tx.id}) — not a real payment; order unchanged`)
  }

  const simulateVerified = () => {
    // Clearly-labelled development action: mirrors the webhook a real gateway would call.
    data.setOrder(order.id, { payment: { provider: 'manual_dev', ref: `DEV-${Date.now().toString(36).toUpperCase()}`, verifiedAt: new Date().toISOString() } })
    data.advanceOrder(order.id, 'payment_verified', 'Marked verified through the development control')
    toast('Order marked payment verified using the development control. Not a real payment.', 'info')
    setOrder({ ...order, status: 'payment_verified' })
  }

  const cancelOrder = () => {
    data.advanceOrder(order.id, 'cancelled', 'Cancelled by student before printing started')
    setOrder({ ...order, status: 'cancelled' })
    toast('Order cancelled.', 'info')
  }

  const canCancel = order && ['payment_pending', 'payment_verified', 'in_queue'].includes(order.status)

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Smart QR Printing</h1>
          <p className="mt-1 text-[12.5px] text-ink-400">Upload, configure and send your document to a print shop.</p>
        </div>
        <Stepper step={step} go={go} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {step === 1 && (
            <Card className="p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[15px] font-semibold text-white">Step 1 · Choose your printing shop</h2>
                <Button onClick={() => setScanOpen(true)} size="md"><ScanLine size={15} /> Scan Shop QR</Button>
              </div>
              <button
                onClick={() => setScanOpen(true)}
                className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-electric-400/25 bg-gradient-to-r from-electric-500/15 to-violet-500/10 p-4 text-left transition-colors hover:border-electric-400/45 hover:from-electric-500/20"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-electric-400/15 text-electric-300 ring-1 ring-electric-400/30"><ScanLine size={19} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-white">Scan the QR code at the shop</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-400">Camera, gallery image or shop code — the shop is identified for you.</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-electric-300" />
              </button>
              <ShopStep shops={shops} shopId={shopId} setShopId={setShopId} go={go} />
            </Card>
          )}

          {step === 2 && (
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-white">Step 2 · Upload your PDF</h2>
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
                className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed py-14 text-center transition-colors ${drag ? 'border-electric-400/60 bg-electric-500/10' : 'border-white/12 bg-navy-950/40 hover:border-electric-400/40 hover:bg-white/[0.02]'}`}
              >
                <div>
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-electric-400/10 text-electric-300 ring-1 ring-electric-400/25"><UploadCloud size={24} /></span>
                  <p className="mt-4 text-[14px] font-semibold text-white">Drop your PDF here or click to browse</p>
                  <p className="mt-1 text-[12px] text-ink-500">PDF only · up to 25 MB · deleted after {shop?.retentionHours || 24}h</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <div className="mt-4 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => go(1)}><ChevronLeft size={14} /> Change shop</Button>
                <Button variant="secondary" size="sm" onClick={() => go(1)}>Back</Button>
              </div>
              <IntegrationNote className="mt-4">
                Files are held in browser memory for this session only. Production uploads to private Supabase Storage and is purged by a scheduled job.
              </IntegrationNote>
            </Card>
          )}

          {step === 3 && (
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-white">Step 3 · Preview</h2>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setRotate((r) => (r + 90) % 360)}><RefreshCw size={13} /> Rotate</Button>
                    <Button variant="ghost" size="sm" onClick={clearFile}><Trash2 size={13} /> Remove</Button>
                  </div>
                </div>
                <PdfPreview fileUrl={fileUrl} name={file?.name} pageCount={pageCount} selected={selectedPages} rotate={rotate} />
              </Card>
              <Card className="p-5">
                <h3 className="text-[14px] font-semibold text-white">Page selection</h3>
                <p className="mt-1 text-[11.5px] text-ink-500">Leave blank to print every page.</p>
                <Input label="Page ranges" placeholder="e.g. 1-5, 8, 12-16" value={rangeInput} onChange={(e) => setRangeInput(e.target.value)} className="mt-3" />
                <div className="mt-3 rounded-xl border border-white/8 bg-navy-950/40 p-3">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-ink-400">Selected pages</span>
                    <span className="font-semibold text-white">{selectedPages.length} of {pageCount || '—'}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedPages.slice(0, 40).map((p) => (
                      <span key={p} className="rounded bg-electric-400/12 px-1.5 py-0.5 text-[10.5px] text-electric-300">{p}</span>
                    ))}
                    {selectedPages.length > 40 && <span className="text-[10.5px] text-ink-500">+{selectedPages.length - 40} more</span>}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => go(2)}><ChevronLeft size={14} /> Back</Button>
                  <Button size="sm" className="flex-1" onClick={() => go(4)}>Configure options <ChevronRight size={14} /></Button>
                </div>
              </Card>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <Card className="space-y-5 p-5">
                <h2 className="text-[15px] font-semibold text-white">Step 4 · Print options</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium text-ink-300">Colour mode</p>
                    <SegmentedControl options={[{ value: 'bw', label: 'Black & white' }, { value: 'color', label: 'Colour' }]} value={color ? 'color' : 'bw'} onChange={(v) => setColor(v === 'color')} className="w-full [&>button]:flex-1" />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium text-ink-300">Sides</p>
                    <SegmentedControl options={[{ value: 'single', label: 'Single-sided' }, { value: 'double', label: 'Double-sided' }]} value={duplex ? 'double' : 'single'} onChange={(v) => setDuplex(v === 'double')} className="w-full [&>button]:flex-1" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-ink-300">Copies</label>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setCopies((c) => Math.max(1, c - 1))} aria-label="Decrease copies">−</Button>
                      <span className="w-10 text-center text-[14px] font-semibold text-white">{copies}</span>
                      <Button variant="secondary" size="sm" onClick={() => setCopies((c) => Math.min(100, c + 1))} aria-label="Increase copies">+</Button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-ink-300" htmlFor="paper">Paper size</label>
                    <select id="paper" value={paper} onChange={(e) => setPaper(e.target.value)} className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2 text-[13px] text-ink-100 outline-none focus:border-electric-400/60">
                      {PAPER_SIZES.map((p) => <option key={p.id} value={p.id} className="bg-navy-900">{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="border-t border-white/8 pt-4">
                  <Toggle checked={binding} onChange={setBinding} label={`Add spiral binding (${fmtMoney(shop?.pricing?.binding ?? 15)} per copy)`} />
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => go(3)}><ChevronLeft size={14} /> Back</Button>
                  <Button size="sm" className="flex-1" onClick={() => go(5)}>Review summary <ChevronRight size={14} /></Button>
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="text-[14px] font-semibold text-white">Live cost estimate</h3>
                <p className="mt-1 text-[11.5px] text-ink-500">From {shop?.name}’s configured rates</p>
                <div className="mt-4 space-y-2 text-[12.5px]">
                  {[
                    ['Rate per page', `${fmtMoney(price.perPage * price.paperMult)}${price.paperMult !== 1 ? ` (${paper})` : ''}`],
                    ['Sheets', `${price.sheets} × ${price.copies} copies`],
                    ['Printing', fmtMoney(price.printing)],
                    ['Binding', price.binding ? fmtMoney(price.binding) : '—'],
                    ['Tax', fmtMoney(price.tax)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-ink-400">{k}</span><span className="font-medium text-ink-100">{v}</span></div>
                  ))}
                  <div className="!mt-4 flex items-center justify-between border-t border-white/8 pt-3">
                    <span className="text-ink-300">Estimated total</span>
                    <span className="font-display text-xl font-bold text-white">{fmtMoney(price.total)}</span>
                  </div>
                </div>
                <p className="mt-3 text-[10.5px] leading-relaxed text-ink-600">Final amount is recalculated on the server when the order is created.</p>
              </Card>
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <Card className="p-5">
                <h2 className="mb-4 text-[15px] font-semibold text-white">Step 5 · Order summary</h2>
                <div className="space-y-2.5 rounded-xl border border-white/8 bg-navy-950/40 p-4 text-[12.5px]">
                  {[
                    ['Shop', shop?.name],
                    ['Document', file?.name],
                    ['Pages', `${rangeInput || `1-${pageCount}`} (${selectedPages.length} pages)`],
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
                    <span className="font-display text-lg font-bold text-white">{fmtMoney(price.total)}</span>
                  </div>
                </div>
                <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-ink-400">
                  <input type="checkbox" checked={retentionAck} onChange={(e) => setRetentionAck(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-electric-500" />
                  <span><ShieldCheck size={12} className="mr-1 inline text-emerald-400" /> I understand my uploaded file is stored temporarily and automatically deleted {shop?.retentionHours || 24} hours after upload.</span>
                </label>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => go(4)}><ChevronLeft size={14} /> Back</Button>
                  <Button size="sm" className="flex-1" onClick={createOrder}>Create order <ChevronRight size={14} /></Button>
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="text-[14px] font-semibold text-white">Printer availability</h3>
                <ul className="mt-3 space-y-2">
                  {data.printers(shopId).map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                      <div>
                        <p className="text-[12px] font-medium text-ink-100">{p.name}</p>
                        <p className="text-[10.5px] text-ink-500">{p.type} · queue {p.queue}</p>
                      </div>
                      <Badge tone={p.status === 'online' ? 'green' : p.status === 'busy' ? 'amber' : 'red'} dot>{p.status}</Badge>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-[11px] text-ink-500">Estimated waiting time</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-white">{data.printers(shopId).some((p) => p.status !== 'maintenance') ? '≈ 10–15 minutes' : 'Currently unavailable'}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-[10.5px] text-ink-600"><AlertTriangle size={10} className="mt-0.5 shrink-0" /> Estimate from current queue depth only.</p>
                </div>
              </Card>
            </div>
          )}

          {step === 6 && order && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-white">Step 6 · Payment</h2>
                  <Badge tone="amber" dot>{STAGE_LABELS[order.status]}</Badge>
                </div>
                <div className="mt-4 rounded-xl border border-white/8 bg-navy-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-ink-500">Order</p>
                      <p className="font-mono text-[13px] font-semibold text-white">#{order.id.replace('ord_', '')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-ink-500">Amount payable</p>
                      <p className="font-display text-xl font-bold text-white">{fmtMoney(order.amount)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-200">
                    <FlaskConical size={12} /> Demo payment mode is on
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-amber-200/75">
                    TEST PAYMENT – NO REAL MONEY PAID. Test the whole checkout safely; a demo result never releases a print job.
                  </p>
                </div>

                {demoTx ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-white">
                        {demoTx.outcome === 'success' ? 'Demo payment simulated' : 'Demo payment simulated as failed'}
                      </p>
                      <Badge tone={demoTx.outcome === 'success' ? 'slate' : 'red'}>TEST</Badge>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-ink-400">{demoTx.id}</p>
                    <p className="mt-1 text-[10.5px] leading-relaxed text-ink-500">
                      TEST PAYMENT – NO REAL MONEY PAID. Order stays “{STAGE_LABELS[order.status]}”; printing is not released by a demo payment.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => setDemoOpen(true)}>View receipt</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setDemoTx(null); setDemoOpen(true) }}>Try again</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button onClick={() => setDemoOpen(true)}><FlaskConical size={15} /> Demo payment</Button>
                    <Button variant="secondary" onClick={() => go(7)}>View order tracking</Button>
                  </div>
                )}

                <div className="mt-4 border-t border-white/8 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Live payment</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {['UPI', 'Card', 'Net banking', 'Pay at counter'].map((m) => (
                      <div key={m} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-[12px] text-ink-500">{m}</div>
                    ))}
                  </div>
                  <Button className="mt-2 w-full" variant="secondary" onClick={payNow} loading={paying}>
                    <CreditCard size={15} /> {paying ? 'Contacting gateway…' : 'Pay with real money (not configured)'}
                  </Button>
                  <p className="mt-1.5 text-[10.5px] text-ink-600">No gateway key is set, so this cannot take money — it says so rather than pretending.</p>
                </div>

                {canCancel && <Button variant="danger" size="sm" className="mt-4" onClick={cancelOrder}>Cancel order</Button>}
              </Card>
              <Card className="p-5">
                <h3 className="text-[14px] font-semibold text-white">Demo transactions for this order</h3>
                <ul className="mt-3 space-y-2">
                  {demoTransactions.forOrder(order.id).length === 0 && (
                    <li className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-6 text-center text-[11.5px] text-ink-500">No demo transactions yet.</li>
                  )}
                  {demoTransactions.forOrder(order.id).map((t) => (
                    <li key={t.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[11px] text-ink-200">{t.id}</p>
                        <Badge tone={t.outcome === 'success' ? 'slate' : 'red'}>{t.outcome === 'success' ? 'demo paid' : 'demo failed'}</Badge>
                      </div>
                      <p className="mt-1 text-[10.5px] text-ink-500">{fmtDate(t.createdAt)} · {fmtMoney(t.amount)} · {t.method}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.05] px-2.5 py-2 text-[10.5px] leading-relaxed text-amber-200/80">
                  Demo records are stored separately from real payments and are never sent to the shop as a paid order.
                </div>
                <p className="mt-3 text-[10.5px] text-ink-600">Order ID {order.id}</p>
              </Card>
            </div>
          )}

          {step === 7 && order && (
            <Card className="p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-[15px] font-semibold text-white">Step 7 · Order tracking</h2>
                  <p className="mt-0.5 text-[11.5px] text-ink-500">#{order.id.replace('ord_', '')} · {order.docName}</p>
                </div>
                <Badge tone={order.status === 'failed' ? 'red' : order.status === 'completed' ? 'green' : 'amber'} dot>{STAGE_LABELS[order.status]}</Badge>
              </div>

              <ol className="mt-6 space-y-0">
                {ORDER_STAGES.map((s, i) => {
                  const currentIdx = ORDER_STAGES.indexOf(order.status)
                  const failed = order.status === 'failed' || order.status === 'cancelled'
                  const done = !failed && currentIdx >= i
                  const active = !failed && currentIdx === i
                  return (
                    <li key={s} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${done ? 'bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40' : active ? 'bg-electric-500 text-white' : 'bg-white/6 text-ink-600'}`}>
                          {done ? <CheckCircle2 size={12} /> : i + 1}
                        </span>
                        {i < ORDER_STAGES.length - 1 && <span className={`my-0.5 h-6 w-px ${done ? 'bg-emerald-400/40' : 'bg-white/10'}`} />}
                      </div>
                      <div className="pb-2">
                        <p className={`text-[12.5px] font-medium ${done || active ? 'text-ink-100' : 'text-ink-600'}`}>{STAGE_LABELS[s]}</p>
                        {active && <p className="text-[10.5px] text-electric-300">Current stage</p>}
                      </div>
                    </li>
                  )
                })}
                {['failed', 'cancelled'].includes(order.status) && (
                  <li className="mt-2 rounded-lg border border-rose-400/25 bg-rose-400/5 px-3 py-2 text-[11.5px] text-rose-200">
                    {order.status === 'failed' ? `Failed — ${order.failureReason || 'reported by the shop'}` : 'Cancelled before printing started.'}
                  </li>
                )}
              </ol>

              <div className="mt-5 flex flex-wrap gap-2">
                {canCancel && <Button variant="danger" size="sm" onClick={cancelOrder}>Cancel order</Button>}
                <Button variant="secondary" size="sm" onClick={() => { setOrder(null); setStep(1); clearFile() }}>New print order</Button>
              </div>
              <p className="mt-4 text-[10.5px] text-ink-600">Status changes are recorded in the order history. The shop updates these stages from its owner dashboard.</p>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <ShopQrScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onConfirm={(id) => { setShopId(id); setScanOpen(false); setStep(2) }}
      />

      <Modal open={demoOpen} onClose={() => setDemoOpen(false)} title="Demo payment" wide>
        {order && (
          <DemoPayment
            order={{ ...order, shopName: shop?.name }}
            onDemoResult={onDemoResult}
            onClose={() => setDemoOpen(false)}
          />
        )}
      </Modal>
    </div>
  )
}
