import { useState } from 'react'
import { Store, Save, MapPin, Phone, Clock, ShieldCheck } from 'lucide-react'
import { Button, Card, Input, Toggle } from '../../components/ui.jsx'
import ShopQrCard from '../../components/ShopQrCard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'

export default function ShopSettings() {
  const { user, updateProfile } = useAuth()
  const data = useData()
  const toast = useToast()
  const shop = data.shop(user.id)
  const [form, setForm] = useState({ name: shop.name, address: shop.address, phone: shop.phone, hours: shop.hours, upiId: shop.upiId })
  const [open, setOpen] = useState(shop.open)

  const shopUrl = `${window.location.origin}/shop/${shop.id}`

  const save = () => {
    if (!form.name.trim()) return toast('Shop name is required.', 'warning')
    data.updateShop(shop.id, { ...form, open })
    updateProfile({ ...form, open })
    toast('Shop profile saved.', 'success')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Shop profile</h1>
        <p className="mt-1 text-[12.5px] text-ink-400">Your details, your QR code and your shop status.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white"><Store size={14} className="text-violet-300" /> Profile details</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input label="Shop name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Owner" value={user.ownerName || ''} disabled hint="Set at registration." />
            <div className="sm:col-span-2"><Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Opening hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            <Input label="UPI ID (for payment reference)" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} />
            <div className="flex items-end pb-2"><Toggle checked={open} onChange={setOpen} label="Accepting new orders" /></div>
          </div>
          <Button className="mt-4" onClick={save}><Save size={14} /> Save profile</Button>
        </Card>

        <div className="space-y-4">
          <ShopQrCard shop={shop} />

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-white">Contact snapshot</h2>
            <ul className="mt-3 space-y-2 text-[11.5px] text-ink-300">
              <li className="flex items-center gap-2"><MapPin size={12} className="text-violet-300" /> {form.address || 'No address set'}</li>
              <li className="flex items-center gap-2"><Phone size={12} className="text-violet-300" /> {form.phone || 'No phone set'}</li>
              <li className="flex items-center gap-2"><Clock size={12} className="text-violet-300" /> {form.hours}</li>
              <li className="flex items-center gap-2"><ShieldCheck size={12} className="text-emerald-400" /> Files kept {shop.retentionHours || 24}h</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
