import { useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, Store, ShieldCheck, Info } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { Button, Input, IntegrationNote } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import AuthAside from '../components/AuthAside.jsx'

export default function Login() {
  const [params] = useSearchParams()
  const [role, setRole] = useState(params.get('role') === 'shop' ? 'shop' : 'student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) return setError('Please enter your email and password.')
    setLoading(true)
    try {
      const res = await login(email, password, role)
      toast(`Signed in successfully.`, 'success')
      navigate(location.state?.from || (res.role === 'shop' ? '/shop-owner' : '/app'), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (r) => {
    setRole(r)
    setEmail(r === 'shop' ? 'owner@vertexprint.in' : 'student@demo.com')
    setPassword('demo1234')
    setError('')
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-[13px] text-ink-400 hover:text-white transition-colors">Back to home</Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Welcome back</h1>
          <p className="mt-2 text-[13.5px] text-ink-400">Sign in to continue to your SMART QR PRINT workspace.</p>

          <div className="mt-7 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-navy-950/50 p-1">
            {[
              { id: 'student', label: 'Student', icon: GraduationCap },
              { id: 'shop', label: 'Shop owner', icon: Store },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setRole(r.id); setError('') }}
                className={`relative flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium transition-colors ${role === r.id ? 'text-white' : 'text-ink-400 hover:text-ink-100'}`}
              >
                {role === r.id && <motion.span layoutId="login-role" className="absolute inset-0 rounded-lg bg-electric-500/20 ring-1 ring-electric-400/40" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative z-10 inline-flex items-center gap-2"><r.icon size={14} /> {r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="relative">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder={role === 'shop' ? 'owner@yourshop.in' : 'you@college.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail size={15} className="pointer-events-none absolute right-3.5 top-[34px] text-ink-500" />
            </div>
            <div className="relative">
              <Input
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={error}
              />
              <Lock size={15} className="pointer-events-none absolute right-10 top-[34px] text-ink-500" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[32px] text-ink-500 hover:text-ink-200" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-500"><ShieldCheck size={12} className="text-emerald-400/80" /> Secure session</span>
              <Link to="/forgot-password" className="text-[12.5px] font-medium text-electric-300 hover:text-electric-200">Forgot password?</Link>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500"><Info size={11} /> Demo accounts</p>
            <div className="mt-2 grid gap-1.5">
              <button onClick={() => fillDemo('student')} className="rounded-lg border border-white/8 px-2.5 py-1.5 text-left text-[11.5px] text-ink-300 hover:border-electric-400/30 hover:bg-white/[0.04]">
                <b className="text-ink-100">Student</b> · student@demo.com · demo1234
              </button>
              <button onClick={() => fillDemo('shop')} className="rounded-lg border border-white/8 px-2.5 py-1.5 text-left text-[11.5px] text-ink-300 hover:border-electric-400/30 hover:bg-white/[0.04]">
                <b className="text-ink-100">Shop owner</b> · owner@vertexprint.in · demo1234
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-[13px] text-ink-400">
            New here? <Link to="/signup" className="font-semibold text-electric-300 hover:text-electric-200">Create an account</Link>
          </p>
          <IntegrationNote className="mt-6">
            Auth runs on a local session store in this build. In production this screen calls Supabase Auth with the same role split.
          </IntegrationNote>
        </motion.div>
      </div>
      <AuthAside />
    </div>
  )
}
