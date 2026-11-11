import { useState } from 'react'
import { motion } from 'framer-motion'
import { Printer, Play, Pause, Wrench, CheckCircle2, Plus, Droplet, X } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Modal, ProgressBar, Select, Input } from '../../components/ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { fmtMoney, timeAgo, STAGE_LABELS } from '../../lib/db.js'

export default function ShopQueue() {
  const { user } = useAuth()
  const data = useData()
  const toast = useToast()
  const printers = data.printers(user.id)
  const orders = data.shopOrders(user.id)
  const queue = orders.filter((o) => ['payment_verified', 'in_queue', 'printing'].includes(o.status))
  const [add, setAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'B&W Laser' })

  const setStatus = (p, status) => {
    data.updatePrinter(p.id, { status })
    toast(`${p.name} set to ${status}.`, 'info')
  }

  const start = (o) => {
    const free = printers.find((p) => p.status === 'online')
    if (!free) return toast('No printer is available. Set one online first.', 'warning')
    data.advanceOrder(o.id, 'printing', `Printing started on ${free.name}`)
    data.updatePrinter(free.id, { status: 'busy', queue: free.queue + 1 })
    toast(`Printing started on ${free.name}.`, 'success')
  }

  const complete = (o) => {
    data.advanceOrder(o.id, 'completed', 'Printed and handed over')
    const busy = printers.find((p) => p.status === 'busy')
    if (busy) data.updatePrinter(busy.id, { status: 'online', queue: Math.max(0, busy.queue - 1) })
    toast('Order completed.', 'success')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Print queue &amp; printers</h1>
          <p className="mt-1 text-[12.5px] text-ink-400">{queue.length} job(s) in the queue · {printers.filter((p) => p.status === 'online').length} printer(s) available</p>
        </div>
        <Button size="sm" onClick={() => setAdd(true)}><Plus size={13} /> Add printer</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-white">Printers</h2>
          <div className="mt-3 space-y-2.5">
            {printers.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink-100">{p.name}</p>
                    <p className="text-[10.5px] text-ink-500">{p.type} · queue {p.queue}</p>
                  </div>
                  <Badge tone={p.status === 'online' ? 'green' : p.status === 'busy' ? 'amber' : 'red'} dot>{p.status}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Droplet size={11} className="text-ink-500" />
                  <ProgressBar value={p.toner} tone={p.toner < 25 ? 'red' : p.toner < 50 ? 'amber' : 'green'} className="flex-1" />
                  <span className="text-[10px] text-ink-500">{p.toner}%</span>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <button onClick={() => setStatus(p, 'online')} className={`flex-1 rounded-md border py-1 text-[10.5px] transition-colors ${p.status === 'online' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-ink-400 hover:text-white'}`}>Online</button>
                  <button onClick={() => setStatus(p, 'busy')} className={`flex-1 rounded-md border py-1 text-[10.5px] transition-colors ${p.status === 'busy' ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-white/10 text-ink-400 hover:text-white'}`}>Busy</button>
                  <button onClick={() => setStatus(p, 'maintenance')} className={`flex-1 rounded-md border py-1 text-[10.5px] transition-colors ${p.status === 'maintenance' ? 'border-rose-400/40 bg-rose-400/10 text-rose-300' : 'border-white/10 text-ink-400 hover:text-white'}`}>Service</button>
                </div>
              </div>
            ))}
            {printers.length === 0 && <EmptyState icon={Printer} title="No printers yet" description="Add your first printer to start accepting jobs." action={<Button size="sm" onClick={() => setAdd(true)}>Add printer</Button>} />}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-white">Live queue</h2>
          <div className="mt-3 space-y-2.5">
            {queue.length === 0 && <EmptyState icon={CheckCircle2} title="Queue is clear" description="No jobs are waiting to print." />}
            {queue.map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-ink-100">{o.docName}</p>
                    <p className="text-[10.5px] text-ink-500">{o.customerName} · {o.pages}p × {o.copies} · {o.color ? 'Colour' : 'B&W'} · {timeAgo(o.createdAt)}</p>
                  </div>
                  <Badge tone={o.status === 'printing' ? 'blue' : 'amber'}>{STAGE_LABELS[o.status]}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white">{fmtMoney(o.amount)}</span>
                  <div className="ml-auto flex gap-1.5">
                    {o.status === 'payment_verified' && <Button size="sm" variant="secondary" onClick={() => data.advanceOrder(o.id, 'in_queue', 'Added to queue')}>Queue</Button>}
                    {o.status === 'in_queue' && <Button size="sm" onClick={() => start(o)}><Play size={11} /> Start</Button>}
                    {o.status === 'printing' && <Button size="sm" variant="success" onClick={() => complete(o)}><CheckCircle2 size={11} /> Complete</Button>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-[10.5px] text-ink-600">Printer states are set by you. The platform does not invent printer telemetry.</p>
        </Card>
      </div>

      <Modal open={add} onClose={() => setAdd(false)} title="Add a printer">
        <div className="space-y-3">
          <Input label="Printer name" placeholder="e.g. HP LaserJet Pro 4001" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {['B&W Laser', 'Colour Laser', 'A3 Colour', 'Inkjet'].map((t) => <option key={t} className="bg-navy-900">{t}</option>)}
          </Select>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (!form.name.trim()) return toast('Enter a printer name.', 'warning')
                data.addPrinter(user.id, { name: form.name, type: form.type })
                toast('Printer added.', 'success')
                setAdd(false); setForm({ name: '', type: 'B&W Laser' })
              }}
            >Add printer</Button>
            <Button size="sm" variant="secondary" onClick={() => setAdd(false)}><X size={12} /> Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
