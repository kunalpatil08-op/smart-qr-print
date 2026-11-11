import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, AlertTriangle, X, XCircle } from 'lucide-react'

const ToastCtx = createContext(() => {})
let seq = 0

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
}
const TONES = {
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  info: 'border-electric-400/30 bg-electric-400/10 text-electric-300',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  error: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const dismiss = useCallback((id) => setItems((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((message, tone = 'info', opts = {}) => {
    const id = ++seq
    setItems((t) => [...t.slice(-3), { id, message, tone, title: opts.title }])
    setTimeout(() => dismiss(id), opts.duration || 4200)
    return id
  }, [dismiss])

  const value = useMemo(() => Object.assign(toast, { dismiss }), [toast, dismiss])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = ICONS[t.tone] || Info
            return (
              <motion.div
                key={t.id}
                role="status"
                layout
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={`pointer-events-auto sm:w-[360px] card !rounded-xl border px-4 py-3 flex gap-3 items-start ${TONES[t.tone]}`}
              >
                <Icon size={18} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1 text-sm">
                  {t.title && <p className="font-semibold mb-0.5">{t.title}</p>}
                  <p className="text-ink-100/90 leading-snug">{t.message}</p>
                </div>
                <button onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-white transition-colors" aria-label="Dismiss notification">
                  <X size={15} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
