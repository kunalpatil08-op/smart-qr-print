import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardList, Clock, CheckCircle2, IndianRupee, Printer, Users, ArrowRight,
  TrendingUp, AlertTriangle, ShieldCheck, Ban, Pause,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, ProgressBar } from '../../components/ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { fmtMoney, timeAgo, STAGE_LABELS } from '../../lib/db.js'
import ShopQrCard from '../../components/ShopQrCard.jsx'

const tone = { completed: 'green', printing: 'blue', in_queue: 'amber', payment_pending: 'amber', payment_verified: 'blue', failed: 'red', uploaded: 'slate', cancelled: 'slate' }

function Kpi({ icon: Icon, label, value, sub, tone: t = 'text-violet-300' }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-ink-500">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-bold leading-none text-white">{value}</p>
        </div>
        <span className={`grid h-8 w-8 place-items-center rounded-lg bg-white/[0.05] ring-1 ring-white/10 ${t}`}><Icon size={15} /></span>
      </div>
      {sub && <p className="mt-3 text-[10.5px] text-ink-500">{sub}</p>}
    </Card>
  )
}

export default function ShopDashboard() {
  const { user } = useAuth()
  const data = useData()
  const toast = useToast()
  const orders = data.shopOrders(user.id)
  const printers = data.printers(user.id)
  const shop = data.shop(user.id)

  const today = new Date().toDateString()
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today)
  const pending = orders.filter((o) => ['uploaded', 'payment_pending', 'payment_verified', 'in_queue'].includes(o.status))
  const completed = orders.filter((o) => o.status === 'completed')
  const revenue = completed.reduce((s, o) => s + (o.amount || 0), 0)
  const todayRevenue = todayOrders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.amount, 0)
  const awaitingPayment = orders.filter((o) => o.status === 'payment_pending')
  const customers = [...new Set(orders.map((o) => o.customerName))]

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const dayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString())
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), count: dayOrders.length, revenue: dayOrders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.amount, 0) }
  })
  const maxCount = Math.max(1, ...week.map((w) => w.count))

  const verify = (o) => {
    data.setOrder(o.id, { payment: { provider: 'upi', ref: `UPI-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, verifiedAt: new Date().toISOString() } })
    data.advanceOrder(o.id, 'payment_verified', 'Payment verified by shop owner')
    toast(`Payment for #${o.id.replace('ord_', '')} marked verified.`, 'success')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{shop?.name}</h1>
          <p className="mt-1 text-[12.5px] text-ink-400">Counter overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={shop?.open ? 'green' : 'slate'} dot>{shop?.open ? 'Open for orders' : 'Closed'}</Badge>
          <Button size="sm" variant="secondary" onClick={() => { data.updateShop(user.id, { open: !shop?.open }); toast(shop?.open ? 'Shop marked closed. New orders are blocked.' : 'Shop marked open.', 'info') }}>
            {shop?.open ? <><Pause size={13} /> Close shop</> : 'Open shop'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={ClipboardList} label="Total orders" value={orders.length} sub={`${todayOrders.length} today`} />
        <Kpi icon={Clock} label="Pending orders" value={pending.length} sub="Awaiting action" tone="text-amber-300" />
        <Kpi icon={CheckCircle2} label="Completed" value={completed.length} sub={`${orders.filter((o) => o.status === 'failed').length} failed`} tone="text-emerald-300" />
        <Kpi icon={IndianRupee} label="Revenue" value={fmtMoney(revenue)} sub={`${fmtMoney(todayRevenue)} today`} tone="text-violet-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-white">This week</h2>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300"><TrendingUp size={11} /> Live data</span>
            </div>
            <div className="mt-5 flex h-36 items-end gap-2">
              {week.map((w, i) => (
                <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex w-full flex-1 items-end">
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: `${(w.count / maxCount) * 100}%` }}
                      transition={{ delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-full rounded-t-md ${i === 6 ? 'bg-gradient-to-t from-violet-600 to-violet-300' : 'bg-white/12 group-hover:bg-white/20'}`}
                    />
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-ink-500 opacity-0 transition-opacity group-hover:opacity-100">{w.count}</span>
                  </div>
                  <span className="text-[10px] text-ink-500">{w.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-white">Recent orders</h2>
              <Link to="/shop-owner/orders" className="inline-flex items-center gap-1 text-[12px] font-medium text-violet-300 hover:text-violet-200">All orders <ArrowRight size={11} /></Link>
            </div>
            {orders.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No orders yet" description="Orders from students will appear here as soon as they scan your QR code." />
            ) : (
              <ul className="divide-y divide-white/6">
                {orders.slice(0, 6).map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink-100">{o.docName}</p>
                      <p className="text-[10.5px] text-ink-500">{o.customerName} · #{o.id.replace('ord_', '')} · {timeAgo(o.createdAt)}</p>
                    </div>
                    <span className="text-[12px] font-semibold text-white">{fmtMoney(o.amount)}</span>
                    <Badge tone={tone[o.status]}>{STAGE_LABELS[o.status]}</Badge>
                    {o.status === 'payment_pending' && (
                      <Button size="sm" variant="secondary" onClick={() => verify(o)}><ShieldCheck size={12} /> Verify</Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-white">Printers</h2>
              <Link to="/shop-owner/queue" className="text-[11.5px] text-violet-300 hover:text-violet-200">Manage</Link>
            </div>
            <ul className="mt-3 space-y-2.5">
              {printers.map((p) => (
                <li key={p.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] font-medium text-ink-100">{p.name}</p>
                    <Badge tone={p.status === 'online' ? 'green' : p.status === 'busy' ? 'amber' : 'red'} dot>{p.status}</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-500">
                    <Printer size={10} /> queue {p.queue} · toner {p.toner}%
                  </div>
                  <ProgressBar value={p.toner} tone={p.toner < 25 ? 'red' : p.toner < 50 ? 'amber' : 'green'} className="mt-1.5" />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-white">Needs attention</h2>
            <div className="mt-3 space-y-2">
              {awaitingPayment.length === 0 && orders.filter((o) => o.status === 'failed').length === 0 ? (
                <p className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-4 text-center text-[11.5px] text-ink-500">Nothing needs your attention right now.</p>
              ) : (
                <>
                  {awaitingPayment.slice(0, 3).map((o) => (
                    <div key={o.id} className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/5 px-2.5 py-2">
                      <Clock size={12} className="shrink-0 text-amber-300" />
                      <p className="flex-1 truncate text-[11.5px] text-amber-100">Payment pending · #{o.id.replace('ord_', '')}</p>
                      <button onClick={() => verify(o)} className="text-[10.5px] font-semibold text-amber-300 hover:text-amber-200">Verify</button>
                    </div>
                  ))}
                  {orders.filter((o) => o.status === 'failed').slice(0, 2).map((o) => (
                    <div key={o.id} className="flex items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-400/5 px-2.5 py-2">
                      <AlertTriangle size={12} className="shrink-0 text-rose-300" />
                      <p className="flex-1 truncate text-[11.5px] text-rose-100">Failed · #{o.id.replace('ord_', '')} · {o.failureReason}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-white"><Users size={13} className="text-violet-300" /> Customers</h2>
            <p className="mt-2 text-[12px] text-ink-400">{customers.length} unique customers · {orders.length} orders</p>
            <ul className="mt-3 space-y-1.5">
              {customers.slice(0, 4).map((c) => {
                const co = orders.filter((o) => o.customerName === c)
                return (
                  <li key={c} className="flex items-center justify-between text-[11.5px]">
                    <span className="truncate text-ink-200">{c}</span>
                    <span className="text-ink-500">{co.length} orders · {fmtMoney(co.reduce((s, o) => s + o.amount, 0))}</span>
                  </li>
                )
              })}
            </ul>
          </Card>

          {shop && <ShopQrCard shop={shop} />}

          <Card className="p-5">
            <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-white"><Ban size={13} className="text-ink-400" /> Shop status</h2>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
              {shop?.open ? 'Students can place orders right now.' : 'New orders are blocked while the shop is closed.'} Printer states are set by you — the platform never invents a printer status.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
