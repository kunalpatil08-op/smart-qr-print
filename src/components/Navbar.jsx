import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, ArrowRight } from 'lucide-react'
import Logo from './Logo.jsx'
import { Button } from './ui.jsx'

const LINKS = [
  { label: 'Home', to: '/', hash: '' },
  { label: 'Smart Printing', to: '/', hash: '#printing' },
  { label: 'AI Assistant', to: '/', hash: '#assistant' },
  { label: 'AI Notes', to: '/', hash: '#notes' },
  { label: 'AI Agent', to: '/', hash: '#agent' },
  { label: 'PDF Editor', to: '/', hash: '#pdf' },
  { label: 'About', to: '/', hash: '#about' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location])

  const go = (link) => (e) => {
    if (link.hash) {
      e.preventDefault()
      if (location.pathname !== '/') {
        navigate('/' + link.hash)
      } else {
        document.querySelector(link.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setOpen(false)
    }
  }

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-navy-900/85 backdrop-blur-xl border-b border-white/8' : 'bg-transparent'}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="hidden lg:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={go(l)}
              className="relative rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-300 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <Button as="div" variant="ghost" size="md" className="!px-3">
            <Link to="/login">Login</Link>
          </Button>
          <Button to="/print" size="md">
            Print now <ArrowRight size={15} />
          </Button>
          <Button to="/signup" variant="secondary" size="md">Sign Up</Button>
        </div>
        <button className="lg:hidden rounded-lg p-2 text-ink-200 hover:bg-white/10" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="lg:hidden overflow-hidden border-t border-white/8 bg-navy-900/97 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {LINKS.map((l) => (
                <Link key={l.label} to={l.to} onClick={go(l)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-200 hover:bg-white/6">
                  {l.label}
                </Link>
              ))}
              <Link to="/print" className="mt-2 block rounded-xl bg-gradient-to-b from-electric-400 to-electric-600 px-4 py-3 text-center text-sm font-semibold text-white">Print now — no login</Link>
              <div className="mt-2 flex gap-2">
                <Link to="/login" className="flex-1 rounded-xl border border-white/12 px-4 py-2.5 text-center text-sm font-semibold text-ink-100">Login</Link>
                <Link to="/signup" className="flex-1 rounded-xl border border-white/12 px-4 py-2.5 text-center text-sm font-semibold text-ink-100">Sign Up</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
