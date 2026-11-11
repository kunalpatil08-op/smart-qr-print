import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, IndianRupee, FileText, PieChart } from 'lucide-react'
import { Card } from '../../components/ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { fmtMoney } from '../../lib/db.js'

export default function ShopAnalytics() {
  const { user } = useAuth()
  const data = useData()
  const orders = data.shopOrders(user.id)

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000)
    const o = orders.filter((x) => new Date(x.createdAt).toDateString() === d.toDateString())
    return { d, count: o.length, revenue: o.filter((x) => x.status === 'completed').reduce((s, x) => s + x.amount, 0), pages: o.reduce((s, x) => s + x.pages * x.copies, 0) }
  })
  const maxRev = Math.max(1, ...days.map((d) => d.revenue))
  const completed = orders.filter((o) => o.status === 'completed')
  const revenue = completed.reduce((s, o) => s + o.amount, 0)
  const pages = orders.reduce((s, o) => s + o.pages * o.copies, 0)
  const aov = completed.length ? revenue / completed.length : 0

  const byStatus = ['completed', 'printing', 'in_queue', 'payment_verified', 'payment_pending', 'failed', 'cancelled'].map((s) => ({ s, n: orders.filter((o) => o.status === s).length })).filter((x) => x.n)
  const totalStatus = byStatus.reduce((a, b) => a + b.n, 0) || 1
  const colors = { completed: 'bg-emerald-400', printing: 'bg-electric-400', in_queue: 'bg-amber-400', payment_verified: 'bg-sky-400', payment_pending: 'bg-orange-400', failed: 'bg-rose-400', cancelled: 'bg-ink-500' }

  const bw = orders.filter((o) => !o.color).length
  const color = orders.filter((o) => o.color).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Sales analytics</h1>
        <p className="mt-1 text-[12.5px] text-ink-400">Calculated from real orders recorded in this shop console.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [IndianRupee, 'Revenue', fmtMoney(revenue), 'text-violet-300'],
          [FileText, 'Pages printed', pages, 'text-emerald-300'],
          [TrendingUp, 'Avg. order value', fmtMoney(aov), 'text-electric-300'],
          [BarChart3, 'Completion rate', `${Math.round((completed.length / Math.max(1, orders.length)) * 100)}%`, 'text-amber-300'],
        ].map(([Icon, label, value, tone]) => (
          <Card key={label} className="p-4">
            <Icon size={14} className={tone} />
            <p className="mt-2 font-display text-xl font-bold leading-none text-white">{value}</p>
            <p className="mt-1 text-[10.5px] text-ink-500">{label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-[14px] font-semibold text-white">Revenue · last 14 days</h2>
        <div className="mt-5 flex h-44 items-end gap-1.5">
          {days.map((d, i) => (
            <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-1 items-end">
                <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(3, (d.revenue / maxRev) * 100)}%` }} transition={{ delay: i * 0.04, duration: 0.5 }} className="w-full rounded-t bg-gradient-to-t from-violet-600/70 to-violet-300/80" />
              </div>
              <span className="text-[8.5px] text-ink-600">{d.d.getDate()}</span>
              <div className="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded bg-navy-950 px-2 py-1 text-[10px] text-ink-100 ring-1 ring-white/15 group-hover:block">
                {fmtMoney(d.revenue)} · {d.count} orders
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-white"><PieChart size={13} className="text-violet-300" /> Orders by status</h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">
            {byStatus.map((b) => <div key={b.s} className={colors[b.s]} style={{ width: `${(b.n / totalStatus) * 100}%` }} />)}
          </div>
          <ul className="mt-4 space-y-1.5">
            {byStatus.map((b) => (
              <li key={b.s} className="flex items-center gap-2 text-[11.5px]">
                <span className={`h-2 w-2 rounded-full ${colors[b.s]}`} />
                <span className="flex-1 capitalize text-ink-300">{b.s.replace('_', ' ')}</span>
                <span className="text-ink-100">{b.n}</span>
                <span className="w-10 text-right text-ink-500">{Math.round((b.n / totalStatus) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-white">Colour vs black &amp; white</h2>
          <div className="mt-5 space-y-4">
            {[['Black & white', bw, 'bg-white/30'], ['Colour', color, 'bg-gradient-to-r from-violet-500 to-electric-400']].map(([label, n, cls]) => (
              <div key={label}>
                <div className="flex justify-between text-[12px]"><span className="text-ink-300">{label}</span><span className="text-ink-100">{n} orders</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(n / Math.max(1, orders.length)) * 100}%` }} className={`h-full rounded-full ${cls}`} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="text-[11px] text-ink-500">Top document sizes</p>
            <ul className="mt-2 space-y-1">
              {orders.slice().sort((a, b) => b.pages * b.copies - a.pages * a.copies).slice(0, 4).map((o) => (
                <li key={o.id} className="flex justify-between text-[11.5px]"><span className="max-w-[65%] truncate text-ink-300">{o.docName}</span><span className="text-ink-500">{o.pages * o.copies} pages</span></li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
