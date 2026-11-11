import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, Search, CheckCircle2, XCircle, Clock, Printer, AlertTriangle, X, ChevronDown } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Modal } from '../../components/ui.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { fmtMoney, fmtDate, STAGE_LABELS, ORDER_STAGES } from '../../lib/db.js'
import { demoTransactions } from '../../lib/payments.js'

const tone = { completed: 'green', printing: 'blue', in_queue: 'amber', payment_pending: 'amber', payment_verified: 'blue', failed: 'red', uploaded: 'slate', cancelled: 'slate' }

export default function Orders() {
  const data = useData()
  const toast = useToast()
  const orders = data.orders()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState(null)

  const filtered = useMemo(() => {
    let l = orders
    if (filter === 'active') l = l.filter((o) => ['uploaded', 'payment_pending', 'payment_verified', 'in_queue', 'printing'].includes(o.status))
    else if (filter === 'completed') l = l.filter((o) => o.status === 'completed')
    else if (filter === 'failed') l = l.filter((o) => ['failed', 'cancelled'].includes(o.status))
    return l.filter((o) => (o.docName + o.id).toLowerCase().includes(q.toLowerCase()))
  }, [orders, filter, q])

  const cancel = (o) => {
    if (!['payment_pending', 'payment_verified', 'in_queue'].includes(o.status)) {
      toast('This order can no longer be cancelled — printing has started.', 'warning')
      return
    }
    data.advanceOrder(o.id, 'cancelled', 'Cancelled by student')
    toast('Order cancelled.', 'info')
    setDetail(null)
  }

  const counts = {
    all: orders.length,
    active: orders.filter((o) => ['uploaded', 'payment_pending', 'payment_verified', 'in_queue', 'printing'].includes(o.status)).length,
    completed: orders.filter((o) => o.status === 'completed').length,
    failed: orders.filter((o) => ['failed', 'cancelled'].includes(o.status)).length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Print Orders</h1>
        <p className="mt-1 text-[12.5px] text-ink-400">Every print order, its status and its full event history.</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {[['all', 'All'], ['active', 'Active'], ['completed', 'Completed'], ['failed', 'Failed / cancelled']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${filter === k ? 'border-electric-400/40 bg-electric-500/15 text-white' : 'border-white/10 text-ink-400 hover:border-white/25 hover:text-ink-100'}`}>
              {l} <span className="ml-1 text-[10.5px] text-ink-500">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders…" className="w-full rounded-lg border border-white/10 bg-navy-950/50 py-2 pl-9 pr-3 text-[12.5px] text-ink-100 outline-none focus:border-electric-400/50" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title="No orders here" description="Orders you create will appear in this list." action={<Button to="/app/print" size="sm">Create a print order</Button>} /></Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card hover className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${o.status === 'failed' ? 'bg-rose-400/10 text-rose-300 ring-rose-400/25' : o.status === 'completed' ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25' : 'bg-white/[0.05] text-ink-300 ring-white/10'}`}>
                    {o.status === 'completed' ? <CheckCircle2 size={17} /> : o.status === 'failed' ? <XCircle size={17} /> : o.status === 'printing' ? <Printer size={17} /> : <Clock size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-100">{o.docName}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      #{o.id.replace('ord_', '')} · {o.pages} pages × {o.copies} · {o.color ? 'Colour' : 'B&W'} · {o.duplex ? 'Double' : 'Single'}-sided · {o.paper} · {fmtDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-white">{fmtMoney(o.amount)}</p>
                    <Badge tone={tone[o.status]} className="mt-1">{STAGE_LABELS[o.status]}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDetail(o)}>Details <ChevronDown size={12} /></Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-white">Demo transaction history</h2>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">TEST PAYMENT – NO REAL MONEY PAID</span>
        </div>
        {demoTransactions.list().length === 0 ? (
          <p className="px-5 py-6 text-center text-[11.5px] text-ink-500">No demo payments yet. They appear here after you test the checkout, kept apart from real payments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-wide text-ink-500">
                <tr className="border-b border-white/6">
                  <th className="px-5 py-2 font-medium">Transaction</th>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {demoTransactions.list().map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-ink-200">{t.id}</td>
                    <td className="px-3 py-2.5 text-ink-400">#{t.orderRef}</td>
                    <td className="px-3 py-2.5 text-ink-100">{fmtMoney(t.amount)}</td>
                    <td className="px-3 py-2.5 text-ink-400">{t.method}</td>
                    <td className="px-3 py-2.5 text-ink-500">{fmtDate(t.createdAt)}</td>
                    <td className="px-5 py-2.5"><Badge tone={t.outcome === 'success' ? 'slate' : 'red'}>{t.outcome === 'success' ? 'demo complete' : 'demo failed'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-white/8 px-5 py-2 text-[10.5px] text-ink-600">Demo records are stored separately from real payments. A demo result never releases a print job.</p>
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Order #${detail.id.replace('ord_', '')}` : ''} wide>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-white">{detail.docName}</p>
                <p className="text-[11px] text-ink-500">{fmtDate(detail.createdAt)}</p>
              </div>
              <Badge tone={tone[detail.status]} dot>{STAGE_LABELS[detail.status]}</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['Pages', `${detail.pageRange || detail.pages} (${detail.pages} selected)`],
                ['Copies', detail.copies],
                ['Colour', detail.color ? 'Colour' : 'Black & white'],
                ['Sides', detail.duplex ? 'Double-sided' : 'Single-sided'],
                ['Paper', detail.paper],
                ['Binding', detail.binding ? 'Spiral' : 'None'],
                ['Amount', fmtMoney(detail.amount)],
                ['Payment', detail.payment ? `${detail.payment.provider} · ${detail.payment.ref}` : 'Not paid'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[12px]">
                  <span className="text-ink-400">{k}</span><span className="font-medium text-ink-100">{v}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[12px] font-semibold text-white">Order history</p>
              <ol className="space-y-1.5">
                {ORDER_STAGES.map((s, i) => {
                  const idx = ORDER_STAGES.indexOf(detail.status)
                  const done = idx >= i && !['failed', 'cancelled'].includes(detail.status)
                  return (
                    <li key={s} className="flex items-center gap-2 text-[12px]">
                      <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-white/15'}`} />
                      <span className={done ? 'text-ink-100' : 'text-ink-600'}>{STAGE_LABELS[s]}</span>
                    </li>
                  )
                })}
              </ol>
              {detail.failureReason && <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/5 px-2.5 py-1.5 text-[11.5px] text-rose-200"><AlertTriangle size={11} /> {detail.failureReason}</p>}
            </div>

            <div className="flex gap-2">
              {['payment_pending', 'payment_verified', 'in_queue'].includes(detail.status) && (
                <Button variant="danger" size="sm" onClick={() => cancel(detail)}><X size={13} /> Cancel order</Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
