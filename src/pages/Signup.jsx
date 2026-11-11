import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, GraduationCap, Store, Check } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { Button, Input, Select, IntegrationNote } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import AuthAside from '../components/AuthAside.jsx'

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate']

export default function Signup() {
  const [role, setRole] = useState('student')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', college: '', course: '', year: '1st Year', shopName: '', address: '' })
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const strength = (() => {
    const p = form.password
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/\d/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  })()

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (!form.name.trim()) err.name = 'Enter your full name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) err.email = 'Enter a valid email address.'
    if (form.password.length < 8) err.password = 'Use at least 8 characters.'
    if (form.password !== form.confirm) err.confirm = 'Passwords do not match.'
    if (role === 'shop' && !form.shopName.trim()) err.shopName = 'Enter your shop name.'
    if (!agree) err.agree = 'Please accept the terms to continue.'
    setErrors(err)
    if (Object.keys(err).length) return
    setLoading(true)
    try {
      const res = await signup({ ...form, role })
      toast('Account created. Welcome to SMART QR PRINT.', 'success')
      navigate(res.role === 'shop' ? '/shop-owner' : '/app', { replace: true })
    } catch (ex) {
      setErrors({ email: ex.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-[13px] text-ink-400 hover:text-white transition-colors">Back to home</Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto my-auto w-full max-w-md py-10">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Create your account</h1>
          <p className="mt-2 text-[13.5px] text-ink-400">Choose how you will use SMART QR PRINT.</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { id: 'student', label: 'Student', desc: 'Print & study with AI', icon: GraduationCap },
              { id: 'shop', label: 'Shop owner', desc: 'Manage your print counter', icon: Store },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setRole(r.id); setErrors({}) }}
                className={`relative rounded-xl border p-3.5 text-left transition-all ${role === r.id ? 'border-electric-400/50 bg-electric-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}
              >
                <r.icon size={17} className={role === r.id ? 'text-electric-300' : 'text-ink-400'} />
                <p className="mt-2 text-[13px] font-semibold text-white">{r.label}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">{r.desc}</p>
                {role === r.id && <span className="absolute right-2.5 top-2.5 grid h-4 w-4 place-items-center rounded-full bg-electric-500 text-white"><Check size={10} /></span>}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            <Input label={role === 'shop' ? 'Owner name' : 'Full name'} placeholder="Aarav Sharma" value={form.name} onChange={set('name')} error={errors.name} />
            <Input label="Email address" type="email" placeholder="you@college.edu" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
            {role === 'student' ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Input label="College / school" placeholder="COEP Technological University" value={form.college} onChange={set('college')} />
                <Input label="Course" placeholder="B.Tech Computer Engineering" value={form.course} onChange={set('course')} />
                <div className="sm:col-span-2">
                  <Select label="Year of study" value={form.year} onChange={set('year')}>
                    {YEARS.map((y) => <option key={y} value={y} className="bg-navy-900">{y}</option>)}
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-3.5">
                <Input label="Shop name" placeholder="Vertex Print Hub" value={form.shopName} onChange={set('shopName')} error={errors.shopName} />
                <Input label="Shop address" placeholder="Gate 2, College Road, Pune" value={form.address} onChange={set('address')} />
              </div>
            )}
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label="Password" type="password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
              <Input label="Confirm password" type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
            </div>
            {form.password && (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? (strength <= 2 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-white/10'}`} />
                  ))}
                </div>
                <span className="text-[11px] text-ink-500">{['Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]}</span>
              </div>
            )}
            <label className="flex items-start gap-2.5 pt-1 text-[12px] leading-relaxed text-ink-400">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-navy-950 accent-electric-500" />
              <span>
                I agree to the Terms of Service and Privacy Policy, including document retention.
                {errors.agree && <span className="mt-0.5 block text-rose-300">{errors.agree}</span>}
              </span>
            </label>
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {loading ? 'Creating account…' : 'Create account'} {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-ink-400">
            Already have an account? <Link to="/login" className="font-semibold text-electric-300 hover:text-electric-200">Sign in</Link>
          </p>
          <IntegrationNote className="mt-5">
            Registration is stored locally in this build. Production uses Supabase Auth + a `profiles` row created by a database trigger.
          </IntegrationNote>
        </motion.div>
      </div>
      <AuthAside />
    </div>
  )
}
