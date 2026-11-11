import { useMemo, useState } from 'react'
import { Search, ShieldCheck, ChevronRight, X, AlertTriangle, RotateCcw, Printer } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Modal } from '../../components/ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { fmtMoney, fmtDate, STAGE_LABELS, ORDER_STAGES } from '../../lib/db.js'

const tone = { completed: 'green', printing: 'blue', in_queue: 'amber', payment_pending: 'amber', payment_verified: 'blue', failed: 'red', uploaded: 'slate', cancelled: 'slate' }
const NEXT = { uploaded: 'payment_pending', payment_pending: 'payment_verified', payment_verified: 'in_queue', in_queue: 'printing', printing: 'completed' }

export default function ShopOrders() {
  const { user } = useAuth()
  const data = useData()
  const toast = useToast()
  const orders = data.shopOrders(user.id)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState(null)
  const [failReason, setFailReason] = useState('')

  const filtered = useMemo(() => {
    let l = orders
    if (filter !== 'all') l = l.filter((o) => (filter === 'active' ? ['uploaded', 'payment_pending', 'payment_verified', 'in_queue', 'printing'].includes(o.status) : o.status === filter))
    return l.filter((o) => (o.docName + o.customerName + o.id).toLowerCase().includes(q.toLowerCase()))
  }, [orders, filter, q])

  const advance = (o) => {
    const next = NEXT[o.status]
    if (!next) return toast('This order cannot move forward.', 'warning')
    if (o.status === 'payment_pending') {
      data.setOrder(o.id, { payment: { provider: 'upi', ref: `UPI-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, verifiedAt: new Date().toISOString() } })
    }
    data.advanceOrder(o.id, next, `Moved to ${STAGE_LABELS[next]} by the shop`)
    toast(`Order #${o.id.replace('ord_', '')} → ${STAGE_LABELS[next]}.`, 'success')
    setDetail(null)
  }

  const markFailed = (o) => {
    if (!failReason.trim()) return toast('Enter a failure reason first.', 'warning')
    data.setOrder(o.id, { failureReason: failReason.trim() })
    data.advanceOrder(o.id, 'failed', failReason.trim())
    toast('Order marked failed with a reason.', 'info')
    setDetail(null); setFailReason('')
  }

  const reprint = (o) => {
    data.setOrder(o.id, { failureReason: '' })
    data.advanceOrder(o.id, 'in_queue', 'Reprint queued by the shop')
    toast('Order re-queued for printing.', 'success')
    setDetail(null)
  }

  const filters = [['all', 'All'], ['active', 'Active'], ['payment_pending', 'Payment pending'], ['in_queue', 'In queue'], ['printing', 'Printing'], ['completed', 'Completed'], ['failed', 'Failed']]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Order management</h1>
        <p className="mt-1 text-[12.5px] text-ink-400">Verify payments, advance stages and handle failed jobs.</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {filters.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-2.5 py-1.5 text-[11.5px] transition-colors ${filter === k ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 text-ink-400 hover:border-white/25 hover:text-ink-100'}`}>{l}</button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-60">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders or students…" className="w-full rounded-lg border border-white/10 bg-navy-950/50 py-2 pl-9 pr-3 text-[12.5px] text-ink-100 outline-none focus:border-violet-400/50" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No orders match this filter" description="Try another filter or clear the search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[12.5px]">
              <thead className="text-[10.5px] uppercase tracking-wide text-ink-500">
                <tr className="border-b border-white/6">
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Document</th>
                  <th className="px-3 py-2.5 font-medium">Config</th>
                  <th className="px-3 py-2.5 font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filtered.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-mono text-[11.5px] text-ink-200">#{o.id.replace('ord_', '')}</p>
                      <p className="text-[10px] text-ink-500">{fmtDate(o.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-3 py-3 text-ink-200">{o.customerName}</td>
                    <td className="max-w-[200px] truncate px-3 py-3 text-ink-300">{o.docName}</td>
                    <td className="px-3 py-3 text-[11px] text-ink-400">{o.pages}p × {o.copies} · {o.color ? 'Colour' : 'B&W'} · {o.duplex ? 'Duplex' : 'Single'} · {o.paper}</td>
                    <td className="px-3 py-3 font-semibold text-white">{fmtMoney(o.amount)}</td>
                    <td className="px-3 py-3"><Badge tone={tone[o.status]}>{STAGE_LABELS[o.status]}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {NEXT[o.status] && <Button size="sm" variant="secondary" onClick={() => advance(o)}>{o.status === 'payment_pending' ? <><ShieldCheck size={11} /> Verify</> : <>Next <ChevronRight size={11} /></>}</Button>}
                        {o.status === 'failed' && <Button size="sm" variant="secondary" onClick={() => reprint(o)}><RotateCcw size={11} /> Reprint</Button>}
                        <Button size="sm" variant="ghost" onClick={() => { setDetail(o); setFailReason('') }}>Details</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Order #${detail.id.replace('ord_', '')}` : ''} wide>
        {detail && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['Customer', detail.customerName],
                ['Document', detail.docName],
                ['Pages', `${detail.pageRange || detail.pages} (${detail.pages})`],
                ['Copies', detail.copies],
                ['Colour', detail.color ? 'Colour' : 'B&W'],
                ['Sides', detail.duplex ? 'Double-sided' : 'Single-sided'],
                ['Paper', detail.paper],
                ['Amount', fmtMoney(detail.amount)],
                ['Payment ref', detail.payment?.ref || 'Not paid'],
                ['Status', STAGE_LABELS[detail.status]],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[12px]">
                  <span className="text-ink-400">{k}</span><span className="max-w-[60%] truncate text-right font-medium text-ink-100">{v}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[12px] font-semibold text-white">Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {ORDER_STAGES.map((s) => (
                  <span key={s} className={`rounded-full border px-2 py-0.5 text-[10.5px] ${ORDER_STAGES.indexOf(detail.status) >= ORDER_STAGES.indexOf(s) ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-ink-600'}`}>{STAGE_LABELS[s]}</span>
                ))}
              </div>
            </div>

            {detail.status !== 'completed' && detail.status !== 'cancelled' && (
              <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.04] p-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-rose-200"><AlertTriangle size={12} /> Mark as failed</p>
                <div className="mt-2 flex gap-2">
                  <input value={failReason} onChange={(e) => setFailReason(e.target.value)} placeholder="e.g. Paper jam on printer PRN-1" className="flex-1 rounded-lg border border-white/10 bg-navy-950/60 px-2.5 py-1.5 text-[12px] text-ink-100 outline-none focus:border-rose-400/50" />
                  <Button size="sm" variant="danger" onClick={() => markFailed(detail)}>Mark failed</Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {NEXT[detail.status] && <Button size="sm" onClick={() => advance(detail)}>{detail.status === 'payment_pending' ? 'Verify payment' : `Move to ${STAGE_LABELS[NEXT[detail.status]]}`}</Button>}
              <Button size="sm" variant="secondary" onClick={() => setDetail(null)}><X size={12} /> Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
