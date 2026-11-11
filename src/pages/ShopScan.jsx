import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UploadCloud, Printer, ShieldCheck, ChevronRight, Store, Clock, MapPin,
  ScanLine, LogIn, ArrowLeft, CheckCircle2, FileText, Wallet,
} from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { Badge, Button, Card } from '../components/ui.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Landing page a shop QR opens. No login required — the guest can go straight
 * into the printing flow for this exact shop.
 */
export default function ShopScan() {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const data = useData()
  const { user } = useAuth()
  const [checking, setChecking] = useState(true)

  const shop = data.shop(shopId)

  useEffect(() => {
    // Resolves the shop from the QR payload (local store today, server in production).
    const t = setTimeout(() => setChecking(false), 350)
    return () => clearTimeout(t)
  }, [shopId])

  const startPrinting = () => navigate(`/print?shop=${encodeURIComponent(shopId)}`)

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-electric-400/30 border-t-electric-400" />
          <p className="mt-4 text-[13px] text-ink-400">Opening shop…</p>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <Card className="max-w-md p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25"><ScanLine size={22} /></span>
          <h1 className="mt-4 text-lg font-semibold text-white">Shop not found</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
            This QR code does not match a registered printing shop. Ask the shop for its current code, or type it on the printing page.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button to="/print" size="md"><Printer size={14} /> Open printing</Button>
            <Button to="/" variant="secondary" size="md">Home</Button>
          </div>
        </Card>
      </div>
    )
  }

  const printers = data.printers(shop.id)
  const online = printers.filter((p) => p.status === 'online').length

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-navy-900/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Logo size="sm" />
          {user ? (
            <Link to={user.role === 'shop' ? '/shop-owner' : '/app'} className="text-[12.5px] font-medium text-electric-300 hover:text-electric-200">My account</Link>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-400 hover:text-white"><LogIn size={13} /> Sign in</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {/* shop identity */}
          <Card className="overflow-hidden">
            <div className="flex items-start gap-3 border-b border-white/8 bg-gradient-to-br from-electric-600/25 to-violet-600/15 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-950/40 text-electric-200 ring-1 ring-white/20"><Store size={19} /></span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300"><CheckCircle2 size={10} /> QR verified</p>
                <h1 className="mt-1 truncate font-display text-xl font-bold text-white">{shop.name}</h1>
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-200"><MapPin size={11} /> {shop.address || 'Address not set'}</p>
              </div>
              <Badge tone={shop.open ? 'green' : 'slate'} dot>{shop.open ? 'Open' : 'Closed'}</Badge>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/8 text-center">
              {[
                [Clock, shop.hours],
                [Printer, `${online}/${printers.length} printers`],
                [Wallet, `₹${shop.pricing.bwSingle}/page`],
              ].map(([Icon, label], i) => (
                <div key={i} className="px-2 py-2.5">
                  <Icon size={12} className="mx-auto text-electric-300" />
                  <p className="mt-1 text-[10.5px] leading-tight text-ink-300">{label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* the one action */}
          <Button size="lg" className="w-full !py-4" onClick={startPrinting} disabled={!shop.open}>
            <UploadCloud size={18} /> {shop.open ? 'Upload & print — no login needed' : 'Shop is closed'}
            {shop.open && <ChevronRight size={16} />}
          </Button>
          {!shop.open && <p className="text-center text-[11.5px] text-ink-500">This shop is not accepting orders right now. You can still open the printing page.</p>}

          <div className="grid grid-cols-3 gap-2">
            {[
              [FileText, 'Upload PDF'],
              [Printer, 'Choose options'],
              [Wallet, 'Pay & collect'],
            ].map(([Icon, label], i) => (
              <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] px-2 py-2.5 text-center">
                <Icon size={13} className="mx-auto text-ink-400" />
                <p className="mt-1 text-[10px] leading-tight text-ink-400">{i + 1}. {label}</p>
              </div>
            ))}
          </div>

          {/* prices */}
          <Card className="p-4">
            <h2 className="text-[13px] font-semibold text-white">Rates at this shop</h2>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11.5px]">
              {[
                ['B&W single', `₹${shop.pricing.bwSingle}/page`],
                ['B&W double', `₹${shop.pricing.bwDouble}/page`],
                ['Colour single', `₹${shop.pricing.colorSingle}/page`],
                ['Colour double', `₹${shop.pricing.colorDouble}/page`],
                ['A3 paper', `×${shop.pricing.a3Multiplier}`],
                ['Spiral binding', `₹${shop.pricing.binding}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2">
                  <span className="text-ink-400">{k}</span><span className="font-medium text-ink-100">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-2.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-ink-600">
              <ShieldCheck size={11} className="mt-0.5 shrink-0 text-emerald-400/80" />
              Your file is deleted {shop.retentionHours || 24} hours after upload. The shop only receives your order after payment is verified.
            </p>
          </Card>

          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-center">
            <p className="text-[11.5px] text-ink-400">Want order history and saved documents?</p>
            <Link to="/signup" className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-electric-300 hover:text-electric-200">
              Create a free account <ChevronRight size={12} />
            </Link>
            <p className="mt-1 text-[10px] text-ink-600">Optional — printing works without one.</p>
          </div>

          <Link to="/" className="flex items-center justify-center gap-1.5 py-2 text-[11.5px] text-ink-500 hover:text-ink-200">
            <ArrowLeft size={12} /> Back to SMART QR PRINT
          </Link>
        </motion.div>
      </main>
    </div>
  )
}
