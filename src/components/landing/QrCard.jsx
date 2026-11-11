import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode/lib/browser.js'
import { ScanLine } from 'lucide-react'

export default function QrCard() {
  const ref = useRef(null)
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!ref.current) return
    QRCode.toDataURL('https://smartqrprint.app/shop/vertex-print-hub', {
      margin: 1,
      width: 220,
      color: { dark: '#040814', light: '#e8eefc' },
      errorCorrectionLevel: 'M',
    })
      .then(setSrc)
      .catch(() => setSrc(''))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="absolute -bottom-8 -right-2 sm:-right-6 lg:-right-10"
    >
      <div className="animate-float relative rounded-2xl border border-white/12 bg-navy-800/95 p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="flex items-center gap-2 pb-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-electric-400/15 text-electric-300 ring-1 ring-electric-400/30">
            <ScanLine size={12} />
          </span>
          <div>
            <p className="text-[9.5px] font-semibold leading-none text-white">Scan to print</p>
            <p className="mt-0.5 text-[8.5px] text-ink-500">Vertex Print Hub</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-ink-100 p-1.5" ref={ref}>
          {src ? (
            <img src={src} alt="Sample shop QR code" width={86} height={86} className="h-[86px] w-[86px] rounded" />
          ) : (
            <div className="h-[86px] w-[86px] rounded bg-ink-100/20" />
          )}
          <motion.span
            className="pointer-events-none absolute inset-x-1.5 h-px bg-electric-500/80 shadow-[0_0_8px_2px_rgba(37,99,235,0.6)]"
            animate={{ top: ['8%', '88%', '8%'] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  )
}
