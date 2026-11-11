import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ScanLine, Camera, CameraOff, ImageUp, Keyboard,
  MapPin, Printer, Clock, Star, Store, Loader2, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { Badge, Button, Card, Input, Modal } from './ui.jsx'
import { useToast } from './Toast.jsx'
import { useQrScanner } from '../lib/useQrScanner.js'
import { parseShopPayload } from '../lib/shopLink.js'
import { useData } from '../context/DataContext.jsx'

function ShopCard({ shop, printers, onConfirm, onCancel, busy }) {
  const online = printers.filter((p) => p.status === 'online').length
  const colour = printers.some((p) => /colour|color/i.test(p.type))
  const a3 = printers.some((p) => /a3/i.test(p.type))
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-electric-400/12 text-electric-300 ring-1 ring-electric-400/25"><Store size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">{shop.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-400"><MapPin size={11} /> {shop.address || 'Address not set'}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
            <span className="inline-flex items-center gap-1"><Clock size={10} /> {shop.hours}</span>
            <span className="inline-flex items-center gap-1"><Printer size={10} /> {online}/{printers.length} printers</span>
            {shop.rating ? <span className="inline-flex items-center gap-1 text-amber-300"><Star size={10} /> {shop.rating}</span> : null}
          </div>
        </div>
        <Badge tone={shop.open ? 'green' : 'slate'} dot>{shop.open ? 'Open' : 'Closed'}</Badge>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Available services</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ['Black & white printing', true],
            ['Colour printing', colour],
            ['A3 paper', a3],
            ['Double-sided', true],
            ['Spiral binding', true],
            ['Scan to print', true],
          ].filter(([, on]) => on).map(([label]) => (
            <span key={label} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-ink-300">{label}</span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-navy-950/40 p-3 text-[11.5px]">
        <div className="flex justify-between"><span className="text-ink-400">B&amp;W single-sided</span><span className="text-ink-100">₹{shop.pricing.bwSingle}/page</span></div>
        <div className="mt-1 flex justify-between"><span className="text-ink-400">Colour single-sided</span><span className="text-ink-100">₹{shop.pricing.colorSingle}/page</span></div>
        <div className="mt-1 flex justify-between"><span className="text-ink-400">Spiral binding</span><span className="text-ink-100">₹{shop.pricing.binding}</span></div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={onConfirm} disabled={busy}>
          {busy ? <><Loader2 size={14} className="animate-spin" /> Opening shop…</> : <>Confirm this shop <ArrowRight size={14} /></>}
        </Button>
        <Button variant="secondary" onClick={onCancel}>Scan a different code</Button>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-[10.5px] text-ink-600"><ShieldCheck size={11} className="text-emerald-400/80" /> Verified Smart QR Print shop link</p>
    </motion.div>
  )
}

/**
 * "Scan Shop QR" panel for step 1 of the printing workflow.
 * Camera → gallery image → manual code, with a confirm-before-continue step.
 */
export default function ShopQrScanner({ open, onClose, onConfirm }) {
  const data = useData()
  const toast = useToast()
  const shops = data.shops()
  const [tab, setTab] = useState('camera')
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState('')
  const [manualError, setManualError] = useState('')
  const fileRef = useRef(null)

  const handleResult = (parsed) => {
    const shop = shops.find((s) => s.id === parsed.shopId)
    if (!shop) {
      toast('That QR code is a valid Smart QR Print link, but no shop with that code is registered here.', 'error', { duration: 7000 })
      return
    }
    setFound({ shop, url: parsed.url })
  }

  const scanner = useQrScanner({
    onResult: handleResult,
    onError: (msg) => toast(msg, 'warning', { duration: 7000 }),
  })

  const close = () => {
    scanner.stop()
    setFound(null)
    setTab('camera')
    scanner.clearError()
    onClose()
  }

  const confirm = () => {
    if (!found) return
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      onConfirm(found.shop.id)
      toast(`${found.shop.name} selected.`, 'success')
      close()
    }, 350)
  }

  const tryManual = () => {
    const parsed = parseShopPayload(manual)
    if (!parsed.ok) {
      setManualError(parsed.reason)
      return
    }
    const shop = shops.find((s) => s.id === parsed.shopId)
    if (!shop) {
      setManualError('No shop with that code is registered here. Check the code with the shop.')
      return
    }
    setManualError('')
    setFound({ shop, url: parsed.url })
  }

  const tabs = [
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'upload', label: 'Upload image', icon: ImageUp },
    { id: 'manual', label: 'Enter code', icon: Keyboard },
  ]

  const printersFor = useMemo(() => (found ? data.printers(found.shop.id) : []), [found, data])

  return (
    <Modal open={open} onClose={close} title="Scan shop QR" wide>
      <AnimatePresence mode="wait">
        {found ? (
          <div key="confirm">
            <ShopCard shop={found.shop} printers={printersFor} onConfirm={confirm} onCancel={() => { setFound(null); setTab('camera') }} busy={busy} />
          </div>
        ) : (
          <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-navy-950/50 p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); if (t.id !== 'camera') scanner.stop() }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-medium transition-colors ${tab === t.id ? 'bg-electric-500/20 text-white ring-1 ring-electric-400/40' : 'text-ink-400 hover:text-ink-100'}`}
                >
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>

            {tab === 'camera' && (
              <div>
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60" style={{ aspectRatio: '4 / 3' }}>
                  <video ref={scanner.videoRef} playsInline muted className="h-full w-full object-cover" aria-label="Camera preview" />
                  <canvas ref={scanner.canvasRef} className="hidden" />
                  {!scanner.active && (
                    <div className="absolute inset-0 grid place-items-center bg-navy-950/80 p-6 text-center">
                      <div>
                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-electric-400/10 text-electric-300 ring-1 ring-electric-400/25"><Camera size={20} /></span>
                        <p className="mt-3 text-[13px] font-medium text-white">Point the camera at the shop’s QR code</p>
                        <p className="mt-1 text-[11.5px] text-ink-500">The camera stays on this device — nothing is uploaded.</p>
                        <Button className="mt-4" size="sm" onClick={() => scanner.start()}><ScanLine size={14} /> Start camera</Button>
                      </div>
                    </div>
                  )}
                  {scanner.active && (
                    <>
                      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-electric-400/70" />
                      <motion.div className="pointer-events-none absolute inset-x-8 h-px bg-electric-300/90" animate={{ top: ['12%', '88%', '12%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
                      <button onClick={scanner.stop} className="absolute right-2 top-2 rounded-lg bg-navy-950/80 px-2 py-1 text-[11px] text-ink-200 ring-1 ring-white/15"><CameraOff size={12} className="mr-1 inline" /> Stop</button>
                    </>
                  )}
                </div>
                {scanner.error && <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-2.5 py-2 text-[11px] leading-relaxed text-amber-200">{scanner.error}</p>}
                <p className="mt-2 text-[10.5px] text-ink-600">On a computer without a camera, use “Upload image” or “Enter code”.</p>
              </div>
            )}

            {tab === 'upload' && (
              <div
                onClick={() => fileRef.current?.click()}
                className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-white/12 bg-navy-950/40 py-12 text-center transition-colors hover:border-electric-400/40"
              >
                <div>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-electric-400/10 text-electric-300 ring-1 ring-electric-400/25"><ImageUp size={20} /></span>
                  <p className="mt-3 text-[13px] font-medium text-white">Upload a QR image from your gallery</p>
                  <p className="mt-1 text-[11.5px] text-ink-500">A screenshot or a photo of the shop’s QR code</p>
                </div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) await scanner.decodeFile(f)
              }}
            />

            {tab === 'manual' && (
              <div className="space-y-2">
                <Input label="Shop code" placeholder="e.g. shop_vertex" value={manual} onChange={(e) => { setManual(e.target.value); setManualError('') }} error={manualError} />
                <Button size="sm" onClick={tryManual}>Find shop</Button>
                <p className="text-[10.5px] text-ink-600">Ask the shop for its code, or scan its QR. The code is printed under the QR poster.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
