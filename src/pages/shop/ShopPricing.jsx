import { useState } from 'react'
import { IndianRupee, Save, Info, RefreshCw } from 'lucide-react'
import { Button, Card, Input } from '../../components/ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { calculatePrice } from '../../lib/pricing.js'
import { fmtMoney } from '../../lib/db.js'

const FIELDS = [
  { key: 'bwSingle', label: 'B&W · single-sided', hint: 'per page' },
  { key: 'bwDouble', label: 'B&W · double-sided', hint: 'per page' },
  { key: 'colorSingle', label: 'Colour · single-sided', hint: 'per page' },
  { key: 'colorDouble', label: 'Colour · double-sided', hint: 'per page' },
  { key: 'a3Multiplier', label: 'A3 multiplier', hint: '× A4 rate' },
  { key: 'binding', label: 'Spiral binding', hint: 'per copy' },
]

export default function ShopPricing() {
  const { user } = useAuth()
  const data = useData()
  const toast = useToast()
  const shop = data.shop(user.id)
  const [pricing, setPricing] = useState({ ...shop.pricing })
  const [retention, setRetention] = useState(shop.retentionHours || 24)

  const preview = calculatePrice({ pages: 24, copies: 2, color: false, duplex: true, paper: 'A4', binding: true, pricing })

  const save = () => {
    const bad = Object.values(pricing).some((v) => Number.isNaN(Number(v)) || Number(v) < 0)
    if (bad) return toast('Rates must be zero or a positive number.', 'warning')
    const clean = Object.fromEntries(Object.entries(pricing).map(([k, v]) => [k, Number(v)]))
    data.updateShop(user.id, { pricing: clean, retentionHours: Number(retention) })
    toast('Rates saved. New orders will use these prices.', 'success')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Pricing configuration</h1>
        <p className="mt-1 text-[12.5px] text-ink-400">These rates are used to calculate every student’s order at your shop.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white"><IndianRupee size={14} className="text-violet-300" /> Printing rates</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Input
                  label={`${f.label} (${f.hint})`}
                  type="number"
                  min="0"
                  step="0.5"
                  value={pricing[f.key]}
                  onChange={(e) => setPricing({ ...pricing, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-white/8 pt-4">
            <h3 className="text-[13px] font-semibold text-white">Document retention</h3>
            <p className="mt-1 text-[11.5px] text-ink-500">Uploaded files are deleted automatically after this many hours.</p>
            <div className="mt-2 flex items-center gap-2">
              <input type="number" min="1" max="168" value={retention} onChange={(e) => setRetention(e.target.value)} className="w-24 rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2 text-[13px] text-ink-100 outline-none focus:border-electric-400/60" />
              <span className="text-[12px] text-ink-400">hours</span>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Button onClick={save}><Save size={14} /> Save rates</Button>
            <Button variant="secondary" onClick={() => setPricing({ ...shop.pricing })}><RefreshCw size={13} /> Reset</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-white">Live preview</h2>
            <p className="mt-1 text-[11.5px] text-ink-500">A 24-page document, 2 copies, double-sided black &amp; white with binding.</p>
            <div className="mt-3 space-y-2 text-[12.5px]">
              {[
                ['Rate per sheet', fmtMoney(preview.perPage)],
                ['Sheets × copies', `${preview.sheets} × ${preview.copies}`],
                ['Printing', fmtMoney(preview.printing)],
                ['Binding', fmtMoney(preview.binding)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-ink-400">{k}</span><span className="font-medium text-ink-100">{v}</span></div>
              ))}
              <div className="!mt-3 flex justify-between border-t border-white/8 pt-3">
                <span className="text-ink-300">Total</span><span className="font-display text-lg font-bold text-white">{fmtMoney(preview.total)}</span>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-500">
              <Info size={13} className="mt-0.5 shrink-0 text-electric-300" />
              In production the same formula runs inside the <code className="rounded bg-white/8 px-1 text-[10.5px]">create_order</code> database function, so a client cannot submit a tampered total.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
