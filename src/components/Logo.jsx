import { Link } from 'react-router-dom'

export default function Logo({ to = '/', size = 'md', showTagline = false }) {
  const dims = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'
  const text = size === 'sm' ? 'text-[14px]' : size === 'lg' ? 'text-lg' : 'text-[15px]'
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="SMART QR PRINT home">
      <span className={`relative grid ${dims} place-items-center rounded-xl bg-gradient-to-br from-electric-400/20 to-electric-600/20 ring-1 ring-electric-400/30 transition-transform duration-300 group-hover:scale-105`}>
        <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" aria-hidden="true">
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7dd3fc" />
              <stop offset="1" stopColor="#4f6bff" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="20" height="20" rx="5" fill="none" stroke="url(#logoGrad)" strokeWidth="5" />
          <rect x="38" y="6" width="20" height="20" rx="5" fill="none" stroke="url(#logoGrad)" strokeWidth="5" />
          <rect x="6" y="38" width="20" height="20" rx="5" fill="none" stroke="url(#logoGrad)" strokeWidth="5" />
          <rect x="38" y="38" width="20" height="20" rx="5" fill="url(#logoGrad)" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={`block font-display font-bold tracking-[0.02em] text-white ${text}`}>SMART QR PRINT</span>
        {showTagline && <span className="mt-1 block text-[10px] font-medium tracking-[0.12em] text-ink-400 uppercase">Print Smarter. Study Better. Achieve More.</span>}
      </span>
    </Link>
  )
}
