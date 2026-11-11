import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode/lib/browser.js'
import { motion } from 'framer-motion'
import { QrCode, Download, Printer, Copy, Share2, ExternalLink, Check, Store } from 'lucide-react'
import { Badge, Button, Card } from './ui.jsx'
import { useToast } from './Toast.jsx'
import { shopLink } from '../lib/shopLink.js'

/**
 * The shop's own QR poster: preview, download (PNG + SVG), print, share link.
 * The encoded URL is the canonical shop link, so scanning always lands on the
 * right shop page.
 */
export default function ShopQrCard({ shop }) {
  const toast = useToast()
  const [png, setPng] = useState('')
  const [svg, setSvg] = useState('')
  const [copied, setCopied] = useState(false)

  const link = useMemo(() => shopLink(shop.id), [shop.id])

  useEffect(() => {
    const opts = { margin: 2, width: 1024, color: { dark: '#040814', light: '#ffffff' }, errorCorrectionLevel: 'M' }
    QRCode.toDataURL(link, opts).then(setPng).catch(() => setPng(''))
    QRCode.toString(link, { ...opts, type: 'svg', width: 512 }).then(setSvg).catch(() => setSvg(''))
  }, [link])

  const slug = shop.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const download = (data, ext) => {
    if (!data) return
    const a = document.createElement('a')
    a.href = ext === 'svg' ? URL.createObjectURL(new Blob([data], { type: 'image/svg+xml' })) : data
    a.download = `${slug}-smartqr-${ext}`
    a.click()
    toast(`QR code downloaded (${ext.toUpperCase()}).`, 'success')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      toast('Shop link copied.', 'success')
    } catch {
      toast('Clipboard is unavailable in this browser.', 'warning')
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shop.name, text: `Print at ${shop.name} with SMART QR PRINT`, url: link })
      } catch {
        /* user dismissed */
      }
    } else {
      copy()
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white"><QrCode size={14} className="text-violet-300" /> Shop QR code</h2>
        <Badge tone="green" dot>Live</Badge>
      </div>

      <div className="p-4">
        {/* the poster that can be printed and put on the counter */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-[260px] rounded-2xl bg-white p-4 text-center shadow-xl print:shadow-none" id="shop-qr-poster">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-600">SMART QR PRINT</p>
          <p className="mt-1 text-[15px] font-bold leading-tight text-slate-900">{shop.name}</p>
          {png ? (
            <img src={png} alt={`QR code for ${shop.name}`} className="mx-auto mt-3 h-40 w-40" />
          ) : (
            <div className="mx-auto mt-3 h-40 w-40 animate-pulse rounded bg-slate-100" />
          )}
          <p className="mt-2 text-[10.5px] font-semibold text-slate-700">Scan to print</p>
          <p className="mt-0.5 break-all font-mono text-[8.5px] text-slate-400">{shop.id}</p>
        </motion.div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-navy-950/50 px-2.5 py-2">
            <Store size={12} className="shrink-0 text-ink-500" />
            <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-ink-300">{link}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => download(png, 'png')} disabled={!png}><Download size={13} /> PNG</Button>
            <Button size="sm" variant="secondary" onClick={() => download(svg, 'svg')} disabled={!svg}><Download size={13} /> SVG</Button>
            <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer size={13} /> Print</Button>
            <Button size="sm" variant="secondary" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy link'}</Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="ghost" onClick={share}><Share2 size={13} /> Share</Button>
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-[13px] font-semibold text-ink-200 hover:border-white/25 hover:text-white">
              <ExternalLink size={13} /> Open
            </a>
          </div>
        </div>

        <p className="mt-3 text-[10.5px] leading-relaxed text-ink-600">
          This QR opens <b className="text-ink-400">your</b> shop page. Print it and place it at the counter — students scan it and their order is routed to you.
        </p>
      </div>
    </Card>
  )
}
