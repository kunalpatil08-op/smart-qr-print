import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight, QrCode, Sparkles, FileText, ScanLine, UploadCloud, Settings2,
  CreditCard, Printer, CheckCircle2, Bot, NotebookPen, Scissors, ShieldCheck,
  Zap, Users, TrendingUp, Clock, ChevronDown, Star, FileStack, MessageSquare,
  Lock, Server, Layers, GraduationCap, Store, ArrowUpRight, CircleDot, BotMessageSquare, Play, Radio,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Logo from '../components/Logo.jsx'
import { Badge, Button, Card, SectionHeading } from '../components/ui.jsx'
import DashboardPreview from '../components/landing/DashboardPreview.jsx'
import QrCard from '../components/landing/QrCard.jsx'
import ProcessDemo from '../components/ProcessDemo.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] } }),
}

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref} className={className} initial="hidden" animate={inView ? 'show' : 'hidden'} custom={delay} variants={fadeUp}>
      {children}
    </motion.div>
  )
}

/* ------------------------------- HERO -------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-electric-500/15 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute top-24 -right-32 h-72 w-72 rounded-full bg-electric-400/10 blur-[90px] animate-float-slow" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:px-8">
        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-electric-400/25 bg-electric-400/8 px-3.5 py-1.5 text-[12px] font-medium text-electric-300">
              <Sparkles size={13} /> Print + AI, in one intelligent workspace
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06 }}
            className="mt-6 text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-[3.6rem]"
          >
            Your Smartest Way to <span className="text-gradient">Print, Learn</span> and Create.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14 }}
            className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-ink-300 sm:text-[17px]"
          >
            One intelligent platform for seamless printing, AI-powered learning and smarter document management.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Button to="/print" size="lg" className="group">
              Print now — no login <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button href="#features" as="a" variant="secondary" size="lg">
              Explore Features
            </Button>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-3 text-[11.5px] text-ink-500">
            No account needed to print — sign up only if you want saved documents and order history.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-ink-400"
          >
            {[
              [ShieldCheck, 'Secure document handling'],
              [Zap, 'Pay-per-page pricing'],
              [Bot, 'AI study assistant'],
            ].map(([Icon, label]) => (
              <span key={label} className="inline-flex items-center gap-2">
                <Icon size={14} className="text-electric-400" /> {label}
              </span>
            ))}
          </motion.div>
        </div>

        <div className="relative">
          <DashboardPreview />
          <QrCard />
        </div>
      </div>
    </section>
  )
}

/* ----------------------------- FEATURES ------------------------------ */

const FEATURES = [
  { icon: QrCode, title: 'Smart QR Printing', desc: 'Scan a shop QR, upload your PDF and choose pages, copies and paper. Cost is calculated instantly from live shop rates.', to: '#printing', tone: 'blue' },
  { icon: Bot, title: 'AI Student Assistant', desc: 'Ask academic questions, get step-by-step explanations and summarise your study material in a clean chat workspace.', to: '#assistant', tone: 'violet' },
  { icon: NotebookPen, title: 'AI Notes Generator', desc: 'Turn a topic, a PDF or pasted text into structured notes — short, detailed, exam-oriented or quick revision sheets.', to: '#notes', tone: 'green' },
  { icon: Scissors, title: 'PDF & Document Editor', desc: 'Merge, split, rotate, reorder and compress pages. Extract text and get AI proofreading before you export a copy.', to: '#pdf', tone: 'amber' },
  { icon: BotMessageSquare, title: 'SMART AI AGENT', desc: 'Always-on agents that watch your orders, notes and documents, run on their own schedule and report back — no prompts needed.', to: '#agent', tone: 'green' },
  { icon: TrendingUp, title: 'Student Productivity', desc: 'Recent documents, saved notes, print history and usage overview in one dashboard built for campus life.', to: '#about', tone: 'blue' },
  { icon: Store, title: 'Shop Owner Dashboard', desc: 'Manage the print queue, verify payments, set rates and generate your own shop QR code — from any device.', to: '#benefits', tone: 'violet' },
]

function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            center
            eyebrow="The platform"
            title="Everything a student needs, in one place"
            subtitle="Six connected modules that share the same documents, notes and orders — so nothing is retyped or re-uploaded."
          />
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i}>
              <Link to={f.to} className="block h-full">
                <Card hover className="group h-full p-6">
                  <div className={`mb-5 grid h-11 w-11 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110 ${
                    f.tone === 'violet' ? 'bg-violet-400/10 ring-violet-400/25 text-violet-300'
                    : f.tone === 'green' ? 'bg-emerald-400/10 ring-emerald-400/25 text-emerald-300'
                    : f.tone === 'amber' ? 'bg-amber-400/10 ring-amber-400/25 text-amber-300'
                    : 'bg-electric-400/10 ring-electric-400/25 text-electric-300'
                  }`}>
                    <f.icon size={21} />
                  </div>
                  <h3 className="text-[16.5px] font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">{f.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-electric-300 opacity-0 transition-opacity group-hover:opacity-100">
                    Learn more <ArrowUpRight size={13} />
                  </span>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------- SMART PRINT ---------------------------- */

const PRINT_STEPS = [
  { icon: ScanLine, title: 'Scan the QR code', desc: 'Find the QR at the counter or open your shop’s link.' },
  { icon: UploadCloud, title: 'Upload your PDF', desc: 'Drag in a file and preview it before ordering.' },
  { icon: Settings2, title: 'Choose your settings', desc: 'Pages, copies, colour, duplex and paper size.' },
  { icon: CreditCard, title: 'Review & pay', desc: 'See the exact cost before confirming anything.' },
  { icon: Printer, title: 'Track it live', desc: 'Follow the queue until it is in your hands.' },
]

function SmartPrinting() {
  return (
    <section id="printing" className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-[700px] -translate-x-1/2 rounded-full bg-electric-600/10 blur-[110px]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              eyebrow="Smart printing"
              title="From phone to printout in under two minutes"
              subtitle="No pen drives, no WhatsApp files, no “is it printed yet?”. A QR-based workflow with transparent pricing and a real order status at every step."
            />
            <div className="mt-8 space-y-3">
              {PRINT_STEPS.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className="flex items-start gap-4 rounded-xl border border-white/6 bg-white/[0.02] p-3.5 transition-colors hover:border-electric-400/25 hover:bg-white/[0.04]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-electric-400/10 text-electric-300 ring-1 ring-electric-400/20">
                    <s.icon size={17} />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-white">
                      <span className="mr-2 text-ink-500">{String(i + 1).padStart(2, '0')}</span>{s.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-400">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={2}>
            <Card className="relative overflow-hidden p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Order summary</p>
                  <p className="mt-1 font-display text-lg font-semibold text-white">Data Structures — Unit 3</p>
                </div>
                <Badge tone="amber" dot>Payment pending</Badge>
              </div>
              <div className="mt-6 space-y-2.5 rounded-xl border border-white/8 bg-navy-950/50 p-4 text-[13px]">
                {[
                  ['Pages', '1–24 (24 pages)'],
                  ['Copies', '2'],
                  ['Mode', 'Black & white · Double-sided'],
                  ['Paper', 'A4'],
                  ['Binding', 'Spiral'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4">
                    <span className="text-ink-400">{k}</span>
                    <span className="text-right font-medium text-ink-100">{v}</span>
                  </div>
                ))}
                <div className="!mt-4 flex items-center justify-between border-t border-white/8 pt-4">
                  <span className="text-ink-300">Estimated total</span>
                  <span className="font-display text-xl font-bold text-white">₹51.00</span>
                </div>
                <p className="text-[11.5px] text-ink-500">Calculated from Vertex Print Hub’s live rates · ₹1.00 × 12 sheets × 2 copies + ₹15 binding</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <Button variant="secondary" size="md">Cancel</Button>
                <Button size="md">Proceed to pay</Button>
              </div>
              <p className="mt-3 text-center text-[11px] text-ink-500">Payment gateway is shown as a labelled placeholder in this build.</p>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------- AI SECTIONS ---------------------------- */

function AIAssistant() {
  return (
    <section id="assistant" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal className="order-2 lg:order-1">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2.5 border-b border-white/8 pb-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400/25 to-electric-500/25 ring-1 ring-violet-400/30">
                  <Bot size={16} className="text-violet-200" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-white">Smart AI Assistant</p>
                  <p className="text-[11px] text-ink-500">Subject-aware · step-by-step</p>
                </div>
                <Badge tone="violet" className="ml-auto">Sample</Badge>
              </div>
              <div className="mt-4 space-y-3">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-electric-500/20 px-4 py-2.5 text-[13px] text-ink-100 ring-1 ring-electric-400/25">
                  Explain normalisation in DBMS with an example.
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] leading-relaxed text-ink-200">
                  <p className="mb-2"><span className="font-semibold text-white">Normalisation</span> organises a table so the same fact is stored once.</p>
                  <ol className="list-decimal space-y-1 pl-4 text-ink-300">
                    <li><b className="text-ink-100">1NF</b> — atomic values, no repeating groups.</li>
                    <li><b className="text-ink-100">2NF</b> — no partial dependency on part of a key.</li>
                    <li><b className="text-ink-100">3NF</b> — no transitive dependency.</li>
                  </ol>
                  <p className="mt-2 text-ink-400">Example: <code className="rounded bg-white/8 px-1 text-[11.5px]">Student(id, name, dept_head)</code> → split into <code className="rounded bg-white/8 px-1 text-[11.5px]">Student(id, name, dept_id)</code> and <code className="rounded bg-white/8 px-1 text-[11.5px]">Dept(dept_id, dept_head)</code>.</p>
                </div>
                <div className="flex items-center gap-1.5 pl-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-300/70" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
                  ))}
                  <span className="ml-1 text-[11px] text-ink-500">Sample conversation for illustration</span>
                </div>
              </div>
            </Card>
          </Reveal>
          <Reveal delay={1} className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="AI student assistant"
              title="A tutor that explains, not just answers"
              subtitle="Ask about any subject, paste your material or upload a file. Get clear step-by-step explanations, summaries and revision plans — then keep the thread for later."
            />
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                [GraduationCap, 'Subject-wise help'],
                [MessageSquare, 'Step-by-step reasoning'],
                [FileStack, 'Summarise study material'],
                [Clock, 'Exam revision plans'],
                [Sparkles, 'Programming & maths'],
                [Lock, 'Keys stay on the server'],
              ].map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-2.5 text-[13px] text-ink-300">
                  <Icon size={15} className="shrink-0 text-violet-300" /> {label}
                </li>
              ))}
            </ul>
            <Button to="/signup" variant="secondary" className="mt-8">Try the assistant</Button>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function AINotes() {
  return (
    <section id="notes" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              eyebrow="AI notes generator"
              title="Structured notes from any topic or PDF"
              subtitle="Pick a format — short, detailed, exam-oriented, definitions, key points, Q&A or a quick revision sheet. Edit everything, organise by subject, then download or print."
            />
            <div className="mt-7 flex flex-wrap gap-2">
              {['Short notes', 'Detailed notes', 'Exam-oriented', 'Definitions', 'Key points', 'Q&A format', 'Revision sheet'].map((t) => (
                <span key={t} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] text-ink-300">{t}</span>
              ))}
            </div>
            <p className="mt-6 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-500">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-400/80" />
              Generated notes are study aids you can edit. They are not guaranteed examination questions.
            </p>
          </Reveal>
          <Reveal delay={1}>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-white">DBMS Normalization — Quick Revision</p>
                <Badge tone="green">Editable</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['1NF', 'Every attribute holds a single atomic value.'],
                  ['2NF', '1NF + every non-key attribute depends on the whole key.'],
                  ['3NF', '2NF + no non-key attribute depends on another non-key attribute.'],
                  ['BCNF', 'Every determinant is a candidate key.'],
                ].map(([k, v], i) => (
                  <motion.div
                    key={k}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.09 }}
                    className="flex gap-3 rounded-lg border border-white/6 bg-white/[0.02] p-3"
                  >
                    <span className="rounded-md bg-emerald-400/12 px-2 py-0.5 text-[11px] font-bold text-emerald-300">{k}</span>
                    <p className="text-[12.5px] leading-relaxed text-ink-300">{v}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary">Download PDF</Button>
                <Button size="sm" variant="ghost">Print notes</Button>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function PdfEditor() {
  return (
    <section id="pdf" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            center
            eyebrow="PDF & document editor"
            title="Fix your document before you print it"
            subtitle="Rotate, reorder, delete, merge, split and compress. Then let AI proofread, summarise or suggest formatting — and export a clean copy."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Layers, 'Merge & split'], [Scissors, 'Delete pages'], [FileText, 'Text extraction'], [Sparkles, 'AI proofreading'],
          ].map(([Icon, label], i) => (
            <Reveal key={label} delay={i}>
              <Card hover className="flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25"><Icon size={16} /></span>
                <span className="text-[13.5px] font-medium text-ink-100">{label}</span>
              </Card>
            </Reveal>
          ))}
        </div>
        <Reveal delay={2}>
          <p className="mx-auto mt-8 max-w-xl text-center text-[12.5px] leading-relaxed text-ink-500">
            Original files are never silently modified. Every edit produces a new copy you export explicitly.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------ AI AGENT ------------------------------ */

const AGENT_CARDS = [
  { icon: Printer, name: 'Print Order Monitor', desc: 'Reports every status change, flags a stalled job and tells you the moment one fails.', every: 'Every 2 hours' },
  { icon: Clock, name: 'Exam Revision Planner', desc: 'Reads your saved notes, finds what is going stale and orders your revision by subject.', every: 'Daily · 08:00' },
  { icon: FileStack, name: 'Document Caretaker', desc: 'Warns you before a file hits its retention window and shows what is worth keeping.', every: 'Every 6 hours' },
]

const AGENT_FEED = [
  { t: 'Print Order Monitor', m: 'DBMS Revision Sheet.pdf moved to “printing”.', tone: 'blue', when: '2m ago' },
  { t: 'Document Caretaker', m: 'Lab Manual expires in 9 hours — print or re-upload it.', tone: 'amber', when: '6m ago' },
  { t: 'Exam Revision Planner', m: '3 notes are due for revision: DBMS ×2, OS ×1.', tone: 'violet', when: '1h ago' },
  { t: 'Print Order Monitor', m: 'Physics Lab Records failed: paper jam on PRN-1.', tone: 'red', when: '3h ago' },
]

function AIAgent() {
  return (
    <section id="agent" className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-[520px] rounded-full bg-emerald-500/10 blur-[110px]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              eyebrow="SMART AI AGENT"
              title="An agent that keeps working after you close the tab"
              subtitle="Create background agents once. Each one watches a slice of your workspace on its own schedule, takes an action and reports back in the notification feed — no prompting, no checking."
            />
            <ul className="mt-7 space-y-2.5">
              {AGENT_CARDS.map((a) => (
                <li key={a.name} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25"><a.icon size={15} /></span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{a.name} <span className="ml-1 rounded bg-white/6 px-1.5 py-0.5 text-[9.5px] font-medium text-ink-400">{a.every}</span></p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">{a.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button to="/signup" size="md"><Play size={14} /> Create your first agent</Button>
              <Button to="/app/agent" variant="secondary" size="md">See the agent console</Button>
            </div>
          </Reveal>

          <Reveal delay={1}>
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-violet-500/25 to-emerald-500/20 ring-1 ring-violet-400/30"><BotMessageSquare size={13} className="text-violet-200" /></span>
                  <p className="text-[12px] font-semibold text-white">SMART AI AGENT</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-400/25">
                  <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>
                  Engine live
                </span>
              </div>
              <div className="p-4">
                <div className="space-y-2.5">
                  {AGENT_FEED.map((n, i) => (
                    <motion.div key={n.t} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.12 }} className="flex items-start gap-2.5 rounded-lg border border-white/8 bg-navy-950/40 px-3 py-2.5">
                      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${n.tone === 'red' ? 'bg-rose-400' : n.tone === 'amber' ? 'bg-amber-400' : n.tone === 'violet' ? 'bg-violet-400' : 'bg-electric-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] font-semibold text-ink-100">{n.t}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{n.m}</p>
                      </div>
                      <span className="shrink-0 text-[9.5px] text-ink-600">{n.when}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-white/12 px-3 py-2 text-[10.5px] text-ink-500">
                  <span className="inline-flex items-center gap-1.5"><Radio size={10} className="text-emerald-400" /> Runs on your account only · read-scoped permissions</span>
                  <span>Illustration</span>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* --------------------------- HOW IT WORKS ---------------------------- */

const HOW = [
  { n: '01', title: 'Create your account', desc: 'Sign up as a student or register your printing shop. Roles are enforced separately.', icon: Users },
  { n: '02', title: 'Upload & configure', desc: 'Bring a PDF, set pages and copies. Cost is calculated from the shop’s own rates.', icon: UploadCloud },
  { n: '03', title: 'Pay & track', desc: 'Pay through the gateway, then follow the order through the queue to completion.', icon: CheckCircle2 },
]

function HowItWorks() {
  return (
    <section id="how" className="relative py-20 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading center eyebrow="How it works" title="Three steps. No friction." />
        </Reveal>
        <div className="relative mt-14 grid gap-5 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-14 hidden h-px bg-gradient-to-r from-electric-400/0 via-electric-400/40 to-electric-400/0 md:block" aria-hidden="true" />
          {HOW.map((s, i) => (
            <Reveal key={s.n} delay={i}>
              <Card hover className="relative h-full p-6 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-electric-400/20 to-electric-600/10 ring-1 ring-electric-400/25">
                  <s.icon size={22} className="text-electric-300" />
                </span>
                <p className="mt-5 font-display text-[11px] font-bold tracking-[0.2em] text-electric-400/70">{s.n}</p>
                <h3 className="mt-1.5 text-[16px] font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-400">{s.desc}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------- BENEFITS ------------------------------ */

function Benefits() {
  const groups = [
    {
      title: 'For students', icon: GraduationCap, tone: 'text-electric-300',
      items: ['Print without pen drives or chat groups', 'Transparent per-page pricing before you pay', 'AI help that explains, not just answers', 'Notes, PDFs and orders in one dashboard', 'Know exactly where your order is'],
    },
    {
      title: 'For printing shops', icon: Store, tone: 'text-violet-300',
      items: ['A QR code that becomes your ordering page', 'Live queue and printer availability', 'Payment verification in one click', 'Configure your own rates and paper sizes', 'Daily revenue and order analytics'],
    },
  ]
  return (
    <section id="benefits" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading center eyebrow="Benefits" title="Built for both sides of the counter" />
        </Reveal>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {groups.map((g, gi) => (
            <Reveal key={g.title} delay={gi}>
              <Card className="h-full p-7">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
                    <g.icon size={18} className={g.tone} />
                  </span>
                  <h3 className="text-[17px] font-semibold text-white">{g.title}</h3>
                </div>
                <ul className="mt-6 space-y-3">
                  {g.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-ink-300">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400/80" /> {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------- TESTIMONIALS --------------------------- */

const TESTIMONIALS = [
  { name: 'Ananya R.', role: '3rd year, Computer Engineering', quote: 'I scan the QR at the shop, upload my lab manual and by the time I reach the counter it is ready. No more asking around for a pen drive.', initials: 'AR' },
  { name: 'Rahul M.', role: 'Owner, print shop', quote: 'The queue screen replaced a notebook. Students pay before printing, so there is no argument about the bill at the counter.', initials: 'RM' },
  { name: 'Sneha K.', role: '2nd year, Electronics', quote: 'The revision sheets from the notes generator are what I actually study from the night before an exam.', initials: 'SK' },
]

function Testimonials() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading center eyebrow="Early feedback" title="What campus users tell us" subtitle="Illustrative feedback collected from early campus pilots." />
        </Reveal>
        <div className="mt-6 flex justify-center">
          <Badge tone="slate">Sample content — for demonstration only</Badge>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i}>
              <Card hover className="h-full p-6">
                <div className="flex gap-0.5 text-amber-300" aria-label="5 out of 5">
                  {[0, 1, 2, 3, 4].map((s) => <Star key={s} size={13} fill="currentColor" />)}
                </div>
                <p className="mt-4 text-[13.5px] leading-relaxed text-ink-200">“{t.quote}”</p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-electric-400/25 to-violet-500/25 text-[12px] font-bold text-white ring-1 ring-white/10">{t.initials}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{t.name}</p>
                    <p className="text-[11.5px] text-ink-500">{t.role}</p>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- FAQ -------------------------------- */

const FAQS = [
  { q: 'How does QR printing actually work?', a: 'Each printing shop has a unique QR code and link. Scan it, upload your PDF, choose pages, copies, colour mode, sides and paper size, and the platform calculates the exact cost using that shop’s configured rates. After payment is verified the order enters the shop’s queue, and you can track each stage until it is completed.' },
  { q: 'Is my uploaded document private?', a: 'Uploaded files are tied to your account and only shared with the shop you ordered from. In production they live in private storage with per-user access policies and are automatically deleted according to the shop’s retention window (24 hours by default).' },
  { q: 'Are the AI answers and notes reliable for exams?', a: 'The AI assistant and notes generator are study aids. Everything they produce is editable, and it is not presented as guaranteed examination questions. Always check against your syllabus and textbook.' },
  { q: 'How is the printing price calculated?', a: 'Price = rate per page (black & white or colour, single or double sided) × sheets × copies, multiplied by the paper-size factor, plus optional binding. Rates are set by each shop, and the total is recalculated on the server before an order is created.' },
  { q: 'Can a student see the shop owner dashboard?', a: 'No. Student and shop-owner accounts are separate roles, and every shop route checks the role before rendering. On a real backend the same rules are enforced with database row-level security, not just in the interface.' },
  { q: 'What happens if a print job fails?', a: 'The shop marks the order as failed with a reason, which appears in your order history. The shop owner can then reprint or resolve it, and the payment reference is kept on the order for reconciliation.' },
  { q: 'Which integrations are live in this build?', a: 'The interface, navigation, forms, pricing engine, order workflow, notes editor and PDF tools are functional. The payment gateway and the AI provider are clearly labelled placeholders until their keys are configured — nothing is simulated as if it succeeded.' },
]

function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading center eyebrow="FAQ" title="Questions, answered" />
        </Reveal>
        <div className="mt-12 space-y-2.5">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.4}>
              <Card className="overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[14px] font-medium text-ink-100">{f.q}</span>
                  <ChevronDown size={17} className={`shrink-0 text-ink-400 transition-transform duration-300 ${open === i ? 'rotate-180 text-electric-300' : ''}`} />
                </button>
                <motion.div initial={false} animate={{ height: open === i ? 'auto' : 0, opacity: open === i ? 1 : 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                  <p className="px-5 pb-5 text-[13px] leading-relaxed text-ink-400">{f.a}</p>
                </motion.div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- ABOUT ------------------------------ */

function About() {
  return (
    <section id="about" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-electric-500/15 blur-[80px]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="About SMART QR PRINT"
                title="Printing should not be the hard part of studying"
                subtitle="SMART QR PRINT was built around a simple observation: students lose hours queueing, transferring files and re-uploading documents. We connect the printing counter to the student’s own workspace, and put an AI study assistant right beside it — so the effort goes into learning, not logistics."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                [Server, 'Server-validated orders'], [Lock, 'Private document storage'],
                [Layers, 'Role-based access'], [ShieldCheck, 'Configurable retention'],
              ].map(([Icon, label]) => (
                <div key={label} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                  <Icon size={16} className="text-electric-300" />
                  <p className="mt-2 text-[12px] leading-snug text-ink-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

/* -------------------------------- CTA -------------------------------- */

function Showcase() {
  const items = [
    { title: 'Smart printing', desc: 'QR → upload → pay → track', icon: QrCode },
    { title: 'AI assistant', desc: 'Explanations that teach', icon: Bot },
    { title: 'AI notes', desc: 'Structured and editable', icon: NotebookPen },
    { title: 'PDF editor', desc: 'Merge, split, rotate', icon: Scissors },
    { title: 'Shop console', desc: 'Queue, rates, QR code', icon: Store },
    { title: 'Role-based access', desc: 'Students and owners split', icon: Lock },
  ]
  return (
    <div className="relative border-y border-white/6 bg-navy-950/40 py-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-4 sm:px-6 lg:px-8">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-600">Built for campus</span>
        {items.map((i) => (
          <div key={i.title} className="flex items-center gap-2">
            <i.icon size={14} className="text-electric-400/80" />
            <div>
              <p className="text-[12px] font-medium leading-none text-ink-200">{i.title}</p>
              <p className="mt-0.5 text-[10px] leading-none text-ink-600">{i.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinalCTA() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-electric-400/20 bg-gradient-to-br from-electric-600/25 via-navy-800 to-violet-600/20 p-10 text-center sm:p-14">
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
            <div className="pointer-events-none absolute -bottom-20 left-1/2 h-52 w-[420px] -translate-x-1/2 rounded-full bg-electric-400/25 blur-[90px]" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to print smarter?</h2>
              <p className="mx-auto mt-4 max-w-lg text-[14.5px] text-ink-200">
                Create a free account and start with your next assignment — or register your shop and take your counter digital.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button to="/signup" size="lg">Get Started</Button>
                <Button to="/login?role=shop" variant="secondary" size="lg">I own a print shop</Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------- FOOTER ------------------------------ */

function Footer() {
  const cols = [
    { title: 'Product', links: [['Smart Printing', '#printing'], ['AI Assistant', '#assistant'], ['AI Notes', '#notes'], ['PDF Editor', '#pdf'], ['SMART AI AGENT', '#agent']] },
    { title: 'Company', links: [['About', '#about'], ['How it works', '#how'], ['FAQ', '#faq'], ['For shops', '#benefits']] },
    { title: 'Account', links: [['Student login', '/login'], ['Shop owner login', '/login?role=shop'], ['Create account', '/signup'], ['Reset password', '/forgot-password']] },
  ]
  return (
    <footer className="border-t border-white/8 bg-navy-950/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo showTagline />
            <p className="mt-5 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
              An intelligent printing and student productivity platform for colleges, schools and local print shops.
            </p>
            <div className="mt-5 flex items-center gap-2 text-[11.5px] text-ink-500">
              <CircleDot size={12} className="text-emerald-400" /> All systems operational
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{c.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map(([label, to]) => (
                    <li key={label}>
                      {to.startsWith('#') ? (
                        <Link to={to} className="text-[12.5px] text-ink-400 transition-colors hover:text-white">{label}</Link>
                      ) : (
                        <Link to={to} className="text-[12.5px] text-ink-400 transition-colors hover:text-white">{label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] text-ink-500">© {new Date().getFullYear()} SMART QR PRINT. All rights reserved.</p>
          <p className="text-[11.5px] text-ink-500">Print Smarter. Study Better. Achieve More.</p>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash && hash.length > 1) {
      const t = setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 160)
      return () => clearTimeout(t)
    }
  }, [hash])
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Showcase />
        <ProcessDemo />
        <Features />
        <SmartPrinting />
        <AIAssistant />
        <AINotes />
        <PdfEditor />
        <AIAgent />
        <HowItWorks />
        <Benefits />
        <Testimonials />
        <FAQ />
        <About />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
