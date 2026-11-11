import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MailCheck, KeyRound } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { Button, Input, IntegrationNote } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { requestReset } = useAuth()

  const submit = async (e) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return
    setLoading(true)
    await requestReset(email)
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="relative flex items-center justify-between px-5 py-6 sm:px-10">
        <Logo />
        <Link to="/login" className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-white transition-colors"><ArrowLeft size={14} /> Back to login</Link>
      </div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto my-auto w-full max-w-sm px-5 pb-16">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-electric-400/10 text-electric-300 ring-1 ring-electric-400/25">
          {sent ? <MailCheck size={22} /> : <KeyRound size={22} />}
        </div>
        {!sent ? (
          <>
            <h1 className="text-2xl font-bold text-white">Reset your password</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">Enter the email linked to your account and we will send a secure reset link.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Input label="Email address" type="email" placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white">Check your inbox</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              If an account exists for <b className="text-ink-100">{email}</b>, a reset link will arrive shortly.
            </p>
            <Button to="/login" variant="secondary" size="lg" className="mt-6 w-full">Return to login</Button>
          </>
        )}
        <IntegrationNote className="mt-6">
          Email delivery is not configured in this build, so no message is actually sent. Production wires this to Supabase Auth `resetPasswordForEmail`.
        </IntegrationNote>
      </motion.div>
    </div>
  )
}
