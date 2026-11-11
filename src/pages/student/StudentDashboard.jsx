import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UploadCloud, Bot, NotebookPen, Scissors, Files, ArrowRight, FileText,
  Printer, Clock, TrendingUp, CheckCircle2, AlertTriangle, Sparkles, BotMessageSquare, Zap, Play, ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useAgent } from '../../context/AgentContext.jsx'
import { runAgent } from '../../lib/agent.js'
import { useToast } from '../../components/Toast.jsx'
import { Badge, Button, Card, ProgressBar, EmptyState } from '../../components/ui.jsx'
import { fmtMoney, fmtDate, timeAgo, STAGE_LABELS } from '../../lib/db.js'

const QUICK = [
  { to: '/app/print', label: 'Upload and Print', desc: 'Send a PDF to a shop', icon: UploadCloud, tone: 'from-electric-500/25 to-electric-600/10 text-electric-300 ring-electric-400/25' },
  { to: '/app/assistant', label: 'Ask AI Assistant', desc: 'Get a clear explanation', icon: Bot, tone: 'from-violet-500/25 to-violet-600/10 text-violet-300 ring-violet-400/25' },
  { to: '/app/notes', label: 'Generate Notes', desc: 'Structured study notes', icon: NotebookPen, tone: 'from-emerald-500/25 to-emerald-600/10 text-emerald-300 ring-emerald-400/25' },
  { to: '/app/pdf-editor', label: 'Edit PDF', desc: 'Merge, split, rotate', icon: Scissors, tone: 'from-amber-500/25 to-amber-600/10 text-amber-300 ring-amber-400/25' },
  { to: '/app/documents', label: 'My Documents', desc: 'Your uploaded files', icon: Files, tone: 'from-sky-500/25 to-sky-600/10 text-sky-300 ring-sky-400/25' },
]

const statusTone = { completed: 'green', printing: 'blue', in_queue: 'amber', payment_pending: 'amber', payment_verified: 'blue', failed: 'red', uploaded: 'slate', cancelled: 'slate' }

function StatCard({ icon: Icon, label, value, sub, tone = 'text-electric-300' }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11.5px] text-ink-500">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-bold leading-none text-white">{value}</p>
        </div>
        <span className={`grid h-8 w-8 place-items-center rounded-lg bg-white/[0.05] ring-1 ring-white/10 ${tone}`}><Icon size={15} /></span>
      </div>
      {sub && <p className="mt-3 text-[11px] text-ink-500">{sub}</p>}
    </Card>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const data = useData()
  const agent = useAgent()
  const toast = useToast()
  const agents = agent.agents()
  const docs = data.documents()
  const notes = data.notes()
  const convos = data.conversations()
  const orders = data.orders()

  const pending = orders.filter((o) => ['payment_pending', 'payment_verified', 'in_queue', 'printing', 'uploaded'].includes(o.status))
  const completed = orders.filter((o) => o.status === 'completed')
  const pagesPrinted = completed.reduce((s, o) => s + o.pages * o.copies, 0)
  const totalSpent = completed.reduce((s, o) => s + (o.amount || 0), 0)
  const limit = user?.monthlyPrintLimit || 400
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[12.5px] text-ink-400">{greeting},</p>
          <h1 className="mt-0.5 text-2xl font-bold text-white sm:text-[28px]">{user?.name?.split(' ')[0]} 👋</h1>
          <p className="mt-1.5 text-[13px] text-ink-400">{user?.course} · {user?.college}</p>
        </div>
        <div className="flex gap-2">
          <Button to="/app/print" size="md"><UploadCloud size={15} /> New print</Button>
          <Button to="/app/assistant" variant="secondary" size="md"><Bot size={15} /> Ask AI</Button>
        </div>
      </motion.div>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {QUICK.map((q, i) => (
          <motion.div key={q.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={q.to} className="group block h-full">
              <Card hover className="h-full p-3.5">
                <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ring-1 ${q.tone}`}>
                  <q.icon size={16} />
                </span>
                <p className="mt-3 text-[12.5px] font-semibold leading-tight text-white">{q.label}</p>
                <p className="mt-1 text-[11px] leading-tight text-ink-500">{q.desc}</p>
                <ArrowRight size={13} className="mt-2.5 text-ink-600 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-electric-300 group-hover:opacity-100" />
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* SMART AI AGENT strip */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500/25 to-electric-500/20 ring-1 ring-violet-400/30"><BotMessageSquare size={15} className="text-violet-200" /></span>
            <div>
              <p className="text-[13.5px] font-semibold text-white">SMART AI AGENT</p>
              <p className="text-[10.5px] text-ink-500">
                {agents.filter((a) => a.enabled).length} active · {agent.status.engine === 'running' ? `engine live, last check ${agent.status.lastTick ? timeAgo(agent.status.lastTick) : 'now'}` : 'engine idle'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <Button size="sm" variant="secondary" onClick={() => { const n = agent.tick(); toast(n ? `${n} agent(s) ran.` : 'Nothing was due — agents are up to date.', 'info') }}><Zap size={12} /> Check now</Button>
            <Button size="sm" to="/app/agent">Manage agents <ArrowUpRight size={12} /></Button>
          </div>
        </div>
        {agents.length === 0 ? (
          <div className="px-5 py-4 text-[12px] text-ink-400">No agents yet — create one to watch your orders and revision in the background.</div>
        ) : (
          <ul className="divide-y divide-white/6">
            {agents.slice(0, 3).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.enabled ? 'bg-emerald-400' : 'bg-ink-600'}`} />
                <p className="text-[12px] font-medium text-ink-100">{a.name}</p>
                <p className="min-w-0 flex-1 truncate text-[11px] text-ink-500">{a.lastResult || 'Has not run yet — press Run on the agent page.'}</p>
                <button onClick={() => { runAgent(a, { userId: user.id, orders, notes, documents: docs, shops: data.shops(), printers: data.printers() }, { manual: true }); toast(`“${a.name}” ran.`, 'success') }} className="inline-flex items-center gap-1 text-[11px] font-medium text-electric-300 hover:text-electric-200"><Play size={10} /> Run</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Printer} label="Total orders" value={orders.length} sub={`${completed.length} completed`} />
        <StatCard icon={Clock} label="Pending" value={pending.length} sub="Awaiting queue or payment" tone="text-amber-300" />
        <StatCard icon={FileText} label="Pages printed" value={pagesPrinted} sub="Across completed orders" tone="text-emerald-300" />
        <StatCard icon={TrendingUp} label="Spent" value={fmtMoney(totalSpent)} sub="Completed orders only" tone="text-violet-300" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* pending orders */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-white">Pending print orders</h2>
              <Link to="/app/orders" className="text-[12px] font-medium text-electric-300 hover:text-electric-200">View all</Link>
            </div>
            {pending.length === 0 ? (
              <EmptyState icon={Printer} title="No pending orders" description="Your queue is clear. Start a new print whenever you are ready." action={<Button to="/app/print" size="sm">Upload &amp; print</Button>} />
            ) : (
              <ul className="divide-y divide-white/6">
                {pending.slice(0, 4).map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] ring-1 ring-white/10"><FileText size={15} className="text-ink-300" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink-100">{o.docName}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">#{o.id.replace('ord_', '')} · {o.pages} pages × {o.copies} · {fmtMoney(o.amount)}</p>
                    </div>
                    <Badge tone={statusTone[o.status]} dot>{STAGE_LABELS[o.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* recent documents */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-white">Recent documents</h2>
              <Link to="/app/documents" className="text-[12px] font-medium text-electric-300 hover:text-electric-200">Manage</Link>
            </div>
            {docs.length === 0 ? (
              <EmptyState icon={Files} title="No documents yet" description="Upload a PDF to get started." action={<Button to="/app/print" size="sm">Upload a file</Button>} />
            ) : (
              <ul className="divide-y divide-white/6">
                {docs.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/20"><FileText size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink-100">{d.name}</p>
                      <p className="text-[10.5px] text-ink-500">{d.pages} pages · {timeAgo(d.createdAt)}</p>
                    </div>
                    <Link to="/app/print" className="text-[11.5px] font-medium text-electric-300 hover:text-electric-200">Print</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* recent AI conversations */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-white">Recent AI conversations</h2>
              <Link to="/app/assistant" className="text-[12px] font-medium text-electric-300 hover:text-electric-200">Open assistant</Link>
            </div>
            {convos.length === 0 ? (
              <EmptyState icon={Bot} title="No conversations yet" description="Ask your first question and it will appear here." action={<Button to="/app/assistant" size="sm">Start a chat</Button>} />
            ) : (
              <ul className="divide-y divide-white/6">
                {convos.slice(0, 3).map((c) => (
                  <li key={c.id}>
                    <Link to={`/app/assistant/${c.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.03]">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-violet-400/10 text-violet-300 ring-1 ring-violet-400/20"><Bot size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-ink-100">{c.title}</p>
                        <p className="text-[10.5px] text-ink-500">{c.messages.length} messages · {timeAgo(c.updatedAt)}</p>
                      </div>
                      <Badge tone="violet">{c.subject || 'General'}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {/* usage */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-electric-300" />
              <h2 className="text-[14px] font-semibold text-white">Usage overview</h2>
            </div>
            <p className="mt-4 text-[11.5px] text-ink-500">Pages this cycle</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="font-display text-2xl font-bold text-white">{pagesPrinted}<span className="text-[13px] font-medium text-ink-500"> / {limit}</span></p>
              <span className="text-[11px] text-ink-400">{Math.round((pagesPrinted / limit) * 100)}%</span>
            </div>
            <ProgressBar value={(pagesPrinted / limit) * 100} className="mt-2.5" />
            <div className="mt-5 space-y-2.5">
              {[
                ['Documents stored', docs.length],
                ['Saved notes', notes.length],
                ['AI conversations', convos.length],
                ['Failed orders', orders.filter((o) => o.status === 'failed').length],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[12px]">
                  <span className="text-ink-400">{k}</span>
                  <span className="font-semibold text-ink-100">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* saved notes */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-white">Saved notes</h2>
              <Link to="/app/notes" className="text-[12px] font-medium text-electric-300 hover:text-electric-200">Open</Link>
            </div>
            {notes.length === 0 ? (
              <EmptyState icon={NotebookPen} title="No notes yet" description="Generate structured notes in seconds." action={<Button to="/app/notes" size="sm">Generate notes</Button>} />
            ) : (
              <ul className="divide-y divide-white/6">
                {notes.slice(0, 3).map((n) => (
                  <li key={n.id}>
                    <Link to="/app/notes" className="block px-5 py-3 transition-colors hover:bg-white/[0.03]">
                      <p className="truncate text-[12.5px] font-medium text-ink-100">{n.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-500"><span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300">{n.subject}</span> {timeAgo(n.updatedAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* shop status */}
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-white">Nearby shop status</h2>
            {data.shops().slice(0, 1).map((s) => {
              const ps = data.printers(s.id)
              const online = ps.filter((p) => p.status === 'online').length
              return (
                <div key={s.id} className="mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] font-medium text-ink-100">{s.name}</p>
                    <Badge tone={s.open ? 'green' : 'slate'} dot>{s.open ? 'Open' : 'Closed'}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-500">{s.address}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                      <p className="text-[10px] text-ink-500">Printers online</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-white">{online} / {ps.length}</p>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                      <p className="text-[10px] text-ink-500">Est. wait</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-white">{online ? '~12 min' : 'Unavailable'}</p>
                    </div>
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-ink-600"><AlertTriangle size={11} className="mt-0.5 shrink-0" /> Estimate only — based on the current queue.</p>
                </div>
              )
            })}
          </Card>
        </div>
      </div>

      {/* order history strip */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-white">Printing order history</h2>
          <Link to="/app/orders" className="text-[12px] font-medium text-electric-300 hover:text-electric-200">Full history</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-[12.5px]">
            <thead className="text-[11px] uppercase tracking-wide text-ink-500">
              <tr className="border-b border-white/6">
                <th className="px-5 py-2.5 font-medium">Order</th>
                <th className="px-3 py-2.5 font-medium">Document</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {orders.slice(0, 5).map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-[11.5px] text-ink-400">#{o.id.replace('ord_', '')}</td>
                  <td className="max-w-[220px] truncate px-3 py-3 text-ink-100">{o.docName}</td>
                  <td className="px-3 py-3 text-ink-400">{fmtDate(o.createdAt, { day: '2-digit', month: 'short' })}</td>
                  <td className="px-3 py-3 font-medium text-ink-100">{fmtMoney(o.amount)}</td>
                  <td className="px-5 py-3"><Badge tone={statusTone[o.status]}>{STAGE_LABELS[o.status]}</Badge></td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-500">No orders yet — <Link to="/app/print" className="text-electric-300">create your first print order</Link>.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="flex items-center justify-center gap-2 pb-2 text-[11px] text-ink-600">
        <CheckCircle2 size={12} className="text-emerald-400/70" /> Print Smarter. Study Better. Achieve More.
      </p>
    </div>
  )
}
