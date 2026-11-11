import { useState } from 'react'
import { User, Mail, GraduationCap, ShieldCheck, Save, LogOut, KeyRound, Bell, Trash2 } from 'lucide-react'
import { Button, Card, Input, Toggle, Badge } from '../../components/ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const { user, updateProfile, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: user.name || '', email: user.email || '', college: user.college || '', course: user.course || '', year: user.year || '1st Year',
  })
  const [notif, setNotif] = useState(true)
  const [emailNotif, setEmailNotif] = useState(false)

  const save = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name cannot be empty.', 'warning')
    updateProfile(form)
    toast('Profile updated.', 'success')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Profile &amp; Settings</h1>
        <p className="mt-1 text-[12.5px] text-ink-400">Manage your account details and preferences.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5 text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-electric-400/30 to-violet-500/30 text-2xl font-bold text-white ring-1 ring-white/15">
            {user.name?.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          </span>
          <p className="mt-4 text-[15px] font-semibold text-white">{user.name}</p>
          <p className="mt-0.5 text-[12px] text-ink-400">{user.email}</p>
          <Badge tone="blue" className="mt-3">Student account</Badge>
          <div className="mt-5 space-y-2 text-left">
            {[
              [GraduationCap, user.course || 'Course not set'],
              [User, user.year || 'Year not set'],
              [Mail, user.college || 'College not set'],
            ].map(([Icon, v]) => (
              <div key={v} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-[11.5px] text-ink-300">
                <Icon size={12} className="text-electric-300" /> <span className="truncate">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => toast('Password reset uses email delivery, which is not configured in this build.', 'warning')}><KeyRound size={13} /> Reset password</Button>
            <Button variant="danger" size="sm" onClick={() => { logout(); navigate('/') }}><LogOut size={13} /></Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-white">Personal information</h2>
            <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled hint="Contact support to change your email." />
              <Input label="College / school" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
              <Input label="Course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[13px] font-medium text-ink-300" htmlFor="year">Year of study</label>
                <select id="year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-3.5 py-2.5 text-sm text-ink-100 outline-none focus:border-electric-400/60">
                  {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'].map((y) => <option key={y} className="bg-navy-900">{y}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" size="md"><Save size={14} /> Save changes</Button>
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white"><Bell size={14} className="text-electric-300" /> Notifications</h2>
            <div className="mt-4 space-y-3">
              <Toggle checked={notif} onChange={setNotif} label="In-app notifications for order status changes" />
              <Toggle checked={emailNotif} onChange={setEmailNotif} label="Email me when a print order is completed" />
            </div>
            <p className="mt-3 text-[10.5px] text-ink-600">Email delivery is not configured in this build, so the email option is saved but sends nothing.</p>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white"><ShieldCheck size={14} className="text-emerald-400" /> Privacy &amp; data</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-400">Uploaded documents are deleted automatically when their retention window ends. You can delete any document from My Documents at any time.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => toast('A data export would be generated by the backend; not available in this build.', 'warning')}>Export my data</Button>
              <Button variant="danger" size="sm" onClick={() => toast('Account deletion requires the backend; not available in this build.', 'warning')}><Trash2 size={12} /> Delete account</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
