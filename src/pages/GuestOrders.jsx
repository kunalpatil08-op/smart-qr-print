import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Printer, FileText, Clock, CheckCircle2, XCircle, ReceiptText, Copy, ChevronRight,
  LogIn, ScanLine, AlertTriangle, FlaskConical, Store,
} from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { Badge, Button, Card, EmptyState, Modal } from '../components/ui.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { fmtMoney, fmtDate, STAGE_LABELS, ORDER_STAGES } from '../lib/db.js'
import { demoTransactions } from '../lib/payments.js'

const tone = { completed: 'green', printing: 'blue', in_queue: 'amber', payment_pending: 'amber', payment_verified: 'blue', failed: 'red', uploaded: 'slate', cancelled: 'slate' }

/**
 * Guest order tracking — works without an account.
 * Logged-in users are sent to their full dashboard history instead.
 */
export default function GuestOrders() {
  const data = useData()
  const { user } = useAuth()
  const toast = useToast()
  const orders = data.orders()
  const [detail, setDetail] = useState(null)
  const demos = demoTransactions.list()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-navy-900/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/"><Logo size="sm" /></Link>
          {user ? (
            <Link to="/app/orders" className="text-[12px] font-medium text-electric-300 hover:text-electric-200">Full history</Link>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-300 hover:text-white"><LogIn size={12} /> Sign in</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 pb-24 pt-4">
        <div>
          <h1 className="text-xl font-bold text-white">My print orders</h1>
          <p className="mt-1 text-[12.5px] text-ink-400">Orders placed from this device{user ? '' : ' as a guest'}.</p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <EmptyState
              icon={Printer}
              title="No orders yet"
              description="Scan the shop QR or upload a PDF to place your first print order — no account needed."
              action={<Button to="/print" size="sm"><ScanLine size={13} /> Start printing</Button>}
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {orders.map((o, i) => (
              <motion.button
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setDetail(o)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-left transition-colors hover:border-white/25"
              >
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${o.status === 'failed' ? 'bg-rose-400/10 text-rose-300 ring-rose-400/25' : o.status === 'completed' ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25' : 'bg-white/[0.05] text-ink-300 ring-white/10'}`}>
                    {o.status === 'completed' ? <CheckCircle2 size={16} /> : o.status === 'failed' ? <XCircle size={16} /> : <Clock size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-100">{o.docName}</p>
                    <p className="mt-0.5 text-[10.5px] text-ink-500">#{o.id.replace('ord_', '')} · {o.pages} pages × {o.copies} · {fmtDate(o.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-white">{fmtMoney(o.amount)}</p>
                    <Badge tone={tone[o.status]} className="mt-1">{STAGE_LABELS[o.status]}</Badge>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-ink-600" />
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {demos.length > 0 && (
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-2.5">
              <h2 className="text-[13px] font-semibold text-white">Demo payment receipts</h2>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-amber-300">TEST – NO REAL MONEY PAID</span>
            </div>
            <ul className="divide-y divide-white/6">
              {demos.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-2 px-4 py-2.5 text-[11.5px]">
                  <FlaskConical size={12} className="shrink-0 text-amber-300" />
                  <span className="min-w-0 flex-1 truncate font-mono text-ink-300">{t.id}</span>
                  <span className="text-ink-500">{fmtMoney(t.amount)}</span>
                  <Badge tone={t.outcome === 'success' ? 'slate' : 'red'}>{t.outcome === 'success' ? 'demo complete' : 'demo failed'}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Button to="/print" className="w-full" size="lg"><Printer size={15} /> Start another print</Button>
        {!user && (
          <p className="text-center text-[11px] text-ink-500">
            Order history is kept on this device.{' '}
            <Link to="/signup" className="font-semibold text-electric-300 hover:text-electric-200">Create an account</Link> to keep it everywhere.
          </p>
        )}
      </main>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Order #${detail.id.replace('ord_', '')}` : ''} wide>
        {detail && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-white">{detail.docName}</p>
                <p className="text-[11px] text-ink-500">{fmtDate(detail.createdAt)} · {data.shop(detail.shopId)?.name}</p>
              </div>
              <Badge tone={tone[detail.status]} dot>{STAGE_LABELS[detail.status]}</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['Pages', `${detail.pageRange || detail.pages} (${detail.pages})`],
                ['Copies', detail.copies],
                ['Colour', detail.color ? 'Colour' : 'Black & white'],
                ['Sides', detail.duplex ? 'Double-sided' : 'Single-sided'],
                ['Paper', detail.paper],
                ['Amount', fmtMoney(detail.amount)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[12px]">
                  <span className="text-ink-400">{k}</span><span className="font-medium text-ink-100">{v}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-white">Status</p>
              <ol className="space-y-1">
                {ORDER_STAGES.map((s, i) => {
                  const done = ORDER_STAGES.indexOf(detail.status) >= i && !['failed', 'cancelled'].includes(detail.status)
                  return (
                    <li key={s} className="flex items-center gap-2 text-[11.5px]">
                      <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-white/15'}`} />
                      <span className={done ? 'text-ink-100' : 'text-ink-600'}>{STAGE_LABELS[s]}</span>
                    </li>
                  )
                })}
              </ol>
            </div>

            {detail.status === 'failed' && <p className="rounded-lg border border-rose-400/25 bg-rose-400/5 px-2.5 py-1.5 text-[11.5px] text-rose-200"><AlertTriangle size={11} className="mr-1 inline" />{detail.failureReason || 'Reported by the shop'}</p>}

            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5 text-[11px] leading-relaxed text-ink-400">
              <p className="flex items-center gap-1.5 font-semibold text-ink-200"><Store size={11} /> Collection</p>
              <p className="mt-1">Show order ID <b className="text-ink-100">#{detail.id.replace('ord_', '')}</b> at {data.shop(detail.shopId)?.name} once the status is Completed.</p>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(detail.id.replace('ord_', '')).then(() => toast('Order ID copied.', 'success')).catch(() => {})}><Copy size={12} /> Copy ID</Button>
              <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
