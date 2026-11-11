import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Printer, CalendarClock, BellRing, FileClock, Store, Plus, Play, Pause, Trash2,
  Power, Clock, History, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Wrench,
  ChevronDown, RefreshCw, Sparkles, MessageCircleQuestion, Loader2, BookOpen, Send,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, IntegrationNote, Modal, Select, Textarea, Toggle } from '../../components/ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAgent } from '../../context/AgentContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { askAgent } from '../../lib/ai.js'
import { isAIConfigured } from '../../lib/ai.js'
import { AGENT_KINDS, TRIGGERS, EVENTS, agentStore, nextRunAt, runAgent, isDue, runStudyQuestionAgent } from '../../lib/agent.js'
import { fmtDate, timeAgo } from '../../lib/db.js'

const ICONS = { printer: Printer, calendar: CalendarClock, bell: BellRing, file: FileClock, store: Store, question: MessageCircleQuestion }
const TONES = {
  blue: 'from-electric-500/25 to-electric-600/10 text-electric-300 ring-electric-400/25',
  violet: 'from-violet-500/25 to-violet-600/10 text-violet-300 ring-violet-400/25',
  green: 'from-emerald-500/25 to-emerald-600/10 text-emerald-300 ring-emerald-400/25',
  amber: 'from-amber-500/25 to-amber-600/10 text-amber-300 ring-amber-400/25',
}

function StatusPill({ agent }) {
  if (!agent.enabled) return <Badge tone="slate" dot>Paused</Badge>
  if (agent.trigger === 'event') return <Badge tone="violet" dot>Listening</Badge>
  if (isDue(agent)) return <Badge tone="amber" dot>Run due</Badge>
  return <Badge tone="green" dot>Active</Badge>
}

export default function Agent() {
  const { user } = useAuth()
  const agent = useAgent()
  const data = useData()
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [kind, setKind] = useState(AGENT_KINDS[0].id)
  const [form, setForm] = useState({ name: '', trigger: 'interval', intervalHours: 6, time: '08:00', event: 'order_status', instructions: '', question: '', subject: 'General' })
  const [asking, setAsking] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [ask, setAsk] = useState({ question: '', subject: 'General', answer: '', note: null, busy: false })

  const agents = agent.agents()
  const runs = agent.allRuns().slice(0, 12)
  const active = agents.filter((a) => a.enabled).length

  const ctx = useMemo(() => ({
    userId: user.id,
    orders: data.orders(),
    notes: data.notes(),
    documents: data.documents(),
    shops: data.shops(),
    printers: data.printers(),
  }), [user.id, data.tick])

  const create = () => {
    const k = AGENT_KINDS.find((x) => x.id === kind)
    agentStore.save({
      userId: user.id,
      kind,
      name: form.name.trim() || k.name,
      enabled: true,
      trigger: form.trigger,
      intervalHours: Number(form.intervalHours) || 6,
      time: form.time,
      event: form.event,
      instructions: form.instructions,
      question: kind === 'study-question' ? form.question : '',
      subject: form.subject,
      nextRunAt: form.trigger === 'event' ? null : nextRunAt({ trigger: form.trigger, intervalHours: form.intervalHours, time: form.time, createdAt: new Date().toISOString() }),
    })
    toast(`${form.name.trim() || k.name} created and armed.`, 'success')
    setCreateOpen(false)
    setForm({ name: '', trigger: 'interval', intervalHours: 6, time: '08:00', event: 'order_status', instructions: '', question: '', subject: 'General' })
    setTimeout(() => agent.tick(), 50)
  }

  const runNow = async (a) => {
    if (a.kind === 'study-question') {
      setAsking(a.id)
      const run = await runStudyQuestionAgent(a, ctx)
      setAsking(null)
      if (run.note) {
        data.saveNote({ title: run.note.title, subject: run.note.subject, style: 'qa', body: run.note.body })
        toast(`“${a.name}” answered and saved a note.`, 'success', { duration: 6000 })
      } else if (run.ok) {
        toast(`“${a.name}” answered.`, 'success')
      } else {
        toast(run.summary, 'error', { duration: 7000 })
      }
      return
    }
    const run = runAgent(a, ctx, { manual: true })
    toast(`Ran “${a.name}” — ${run.summary.slice(0, 90)}`, 'success', { duration: 6000 })
  }

  const askNow = async () => {
    if (!ask.question.trim()) return toast('Type a question first.', 'warning')
    setAsk((s) => ({ ...s, busy: true, answer: '', note: null }))
    try {
      const res = await askAgent({ question: ask.question, subject: ask.subject, saveAsNote: true })
      if (!res.configured) throw new Error(res.message)
      if (res.note) data.saveNote({ title: res.note.title, subject: res.note.subject, style: 'qa', body: res.note.body })
      setAsk((s) => ({ ...s, busy: false, answer: res.answer, note: res.note }))
      toast(res.note ? 'Answered and saved as a note.' : 'Answered.', 'success')
    } catch (e) {
      setAsk((s) => ({ ...s, busy: false, answer: `⚠ ${e.message}` }))
      toast(e.message, 'error', { duration: 8000 })
    }
  }

  const toggle = (a) => {
    agentStore.save({ id: a.id, enabled: !a.enabled, nextRunAt: !a.enabled ? (a.trigger === 'event' ? null : nextRunAt({ ...a, lastRunAt: null })) : a.nextRunAt })
    toast(a.enabled ? `${a.name} paused.` : `${a.name} resumed.`, 'info')
  }

  const remove = (a) => {
    if (!confirm(`Delete “${a.name}” and its run history?`)) return
    agentStore.remove(a.id)
    toast('Agent deleted.', 'info')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl">
            SMART AI AGENT
            <Badge tone={agent.status.engine === 'running' ? 'green' : 'slate'} dot>{agent.status.engine === 'running' ? 'Engine live' : 'Idle'}</Badge>
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-400">Background agents that watch your printing, notes and documents and act on their own.</p>
        </div>
        <div className="flex gap-2">
          <Button size="md" variant="secondary" onClick={() => setAskOpen(true)}><MessageCircleQuestion size={15} /> Ask the agent</Button>
          <Button size="md" onClick={() => setCreateOpen(true)}><Plus size={15} /> New agent</Button>
        </div>
      </div>

      {/* runtime strip — honest about where the engine runs */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { icon: Power, label: 'Engine', value: agent.status.engine === 'running' ? 'Running' : 'Idle', tone: 'text-emerald-300' },
            { icon: Zap, label: 'Heartbeat', value: agent.status.lastTick ? timeAgo(agent.status.lastTick) : '—', tone: 'text-electric-300' },
            { icon: Clock, label: 'Active agents', value: `${active}/${agents.length}`, tone: 'text-violet-300' },
            { icon: History, label: 'Checks run', value: agent.status.tickCount, tone: 'text-amber-300' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
              <s.icon size={13} className={s.tone} />
              <p className="mt-1.5 font-display text-[15px] font-bold leading-none text-white">{s.value}</p>
              <p className="mt-1 text-[10px] text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-ink-500">
          <span className="inline-flex items-center gap-1"><ShieldCheck size={11} className="text-emerald-400/80" /> Runs on your account only — read-scoped permissions per agent.</span>
          <span className="inline-flex items-center gap-1"><Wrench size={11} /> While this tab is open the engine checks every 30 s; with the app closed nothing runs and nothing is claimed to have run.</span>
        </div>
      </Card>

      {agents.length === 0 ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="No agents yet"
            description="Create your first background agent — a print monitor or a revision planner takes ten seconds to set up."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={13} /> Create an agent</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a, i) => {
            const k = AGENT_KINDS.find((x) => x.id === a.kind) || AGENT_KINDS[0]
            const Icon = ICONS[k.icon] || Printer
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card hover className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ring-1 ${TONES[k.tone]}`}><Icon size={16} /></span>
                    <StatusPill agent={a} />
                  </div>
                  <p className="mt-3 text-[13.5px] font-semibold text-white">{a.name}</p>
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-400">{k.description}</p>

                  <div className="mt-3 rounded-lg border border-white/8 bg-navy-950/40 px-2.5 py-2">
                    <p className="text-[9.5px] uppercase tracking-wide text-ink-600">Last result</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-300">{a.lastResult || 'Has not run yet.'}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10.5px] text-ink-500">
                    <span className="inline-flex items-center gap-1"><Clock size={10} /> {a.trigger === 'event' ? 'On event' : a.trigger === 'daily' ? `Daily ${a.time}` : `Every ${a.intervalHours}h`}</span>
                    <span>{a.runCount || 0} run(s)</span>
                  </div>

                  <div className="mt-auto flex gap-1.5 pt-3">
                    <Button size="sm" variant="secondary" onClick={() => runNow(a)} disabled={asking === a.id}>
                      {asking === a.id ? <><Loader2 size={11} className="animate-spin" /> Working…</> : <><Play size={11} /> Run</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(a)}>{a.enabled ? <Pause size={12} /> : <Power size={12} />}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDetail(a)}><History size={12} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(a)} className="!text-ink-500 hover:!text-rose-300"><Trash2 size={12} /></Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* run history */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-white">Agent activity</h2>
          <button onClick={() => { agent.tick(); toast('Ran a catch-up pass across all due agents.', 'info') }} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-electric-300 hover:text-electric-200"><RefreshCw size={11} /> Check now</button>
        </div>
        {runs.length === 0 ? (
          <EmptyState icon={History} title="No runs recorded" description="Runs appear here the moment an agent does something — nothing is pre-filled." />
        ) : (
          <ul className="divide-y divide-white/6">
            {runs.map((r) => {
              const a = agents.find((x) => x.id === r.agentId)
              return (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20"><CheckCircle2 size={12} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-ink-100">{a?.name || 'Deleted agent'} <span className="font-normal text-ink-600">· {r.trigger}</span></p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">{r.summary}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-ink-600">{timeAgo(r.at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <IntegrationNote>
        Agents are rule-based automations over <b>your own</b> data, so they never invent facts and never need a paid model. To make an agent <b>write</b> something with AI (a real revision plan, a proofread), connect the AI provider — the agent will then use it; until then it only reports and reminds, and says so.
      </IntegrationNote>

      {/* create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create an agent" wide>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-300">Agent type</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {AGENT_KINDS.map((k) => {
                const Icon = ICONS[k.icon]
                return (
                  <button key={k.id} onClick={() => setKind(k.id)} className={`rounded-xl border p-3 text-left transition-colors ${kind === k.id ? 'border-electric-400/50 bg-electric-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}>
                    <div className="flex items-center gap-2"><Icon size={14} className={kind === k.id ? 'text-electric-300' : 'text-ink-400'} /><p className="text-[12.5px] font-semibold text-white">{k.name}</p></div>
                    <p className="mt-1 text-[10.5px] leading-snug text-ink-500">{k.description}</p>
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded bg-white/6 px-1.5 py-0.5 text-[9px] text-ink-400"><ShieldCheck size={8} /> {k.permission}</p>
                  </button>
                )
              })}
            </div>
          </div>
          <Input label="Agent name (optional)" placeholder={AGENT_KINDS.find((k) => k.id === kind)?.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Trigger" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
              {TRIGGERS.map((t) => <option key={t.id} value={t.id} className="bg-navy-900">{t.label}</option>)}
            </Select>
            {form.trigger === 'interval' && (
              <Input label="Every (hours)" type="number" min="1" max="168" value={form.intervalHours} onChange={(e) => setForm({ ...form, intervalHours: e.target.value })} />
            )}
            {form.trigger === 'daily' && (
              <Input label="Time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            )}
            {form.trigger === 'event' && (
              <Select label="Event" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })}>
                {EVENTS.map((ev) => <option key={ev.id} value={ev.id} className="bg-navy-900">{ev.label}</option>)}
              </Select>
            )}
          </div>
          {kind === 'study-question' && (
            <div className="grid gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.04] p-3">
              <Textarea label="Question for the agent" rows={3} placeholder="e.g. Explain the difference between process and thread with an example." value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
              <Input label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <p className="text-[10.5px] text-ink-500">Each run calls {isAIConfigured ? 'Gemini Flash' : 'the AI (not configured yet)'} once and files the answer as a note.</p>
            </div>
          )}
          <Textarea label="What should it do? (instructions, optional)" rows={3} placeholder="e.g. Tell me if any order sits in the queue for more than 30 minutes." value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          <div className="flex gap-2">
            <Button onClick={create}><Zap size={14} /> Create &amp; arm agent</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* ask-the-agent modal */}
      <Modal open={askOpen} onClose={() => setAskOpen(false)} title="Ask SMART AI AGENT" wide>
        <div className="space-y-3">
          <Textarea label="Your question" rows={3} placeholder="Ask anything you are studying…" value={ask.question} onChange={(e) => setAsk({ ...ask, question: e.target.value })} />
          <div className="flex items-end gap-2">
            <div className="flex-1"><Input label="Subject" value={ask.subject} onChange={(e) => setAsk({ ...ask, subject: e.target.value })} /></div>
            <Button onClick={askNow} loading={ask.busy} disabled={ask.busy}>{ask.busy ? 'Thinking…' : <><Send size={13} /> Ask</>}</Button>
          </div>
          {ask.answer && (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <Badge tone="violet">Answer</Badge>
                {ask.note && <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-300"><BookOpen size={10} /> saved to Notes</span>}
              </div>
              <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-200">{ask.answer}</p>
            </div>
          )}
          {!isAIConfigured && <IntegrationNote>AI is not configured on this deployment. Add GEMINI_API_KEY in Netlify to enable agent answers — nothing is simulated meanwhile.</IntegrationNote>}
        </div>
      </Modal>

      {/* detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || ''} wide>
        {detail && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['Type', AGENT_KINDS.find((k) => k.id === detail.kind)?.name],
                ['Trigger', detail.trigger === 'event' ? `On ${detail.event}` : detail.trigger === 'daily' ? `Daily at ${detail.time}` : `Every ${detail.intervalHours}h`],
                ['Status', detail.enabled ? 'Enabled' : 'Paused'],
                ['Runs', detail.runCount || 0],
                ['Last run', detail.lastRunAt ? fmtDate(detail.lastRunAt) : 'Never'],
                ['Next run', detail.nextRunAt ? fmtDate(detail.nextRunAt) : detail.trigger === 'event' ? 'On event' : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[12px]">
                  <span className="text-ink-400">{k}</span><span className="font-medium text-ink-100">{v}</span>
                </div>
              ))}
            </div>
            {detail.instructions && <p className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-[12px] text-ink-300">{detail.instructions}</p>}
            <div>
              <p className="mb-2 text-[12px] font-semibold text-white">Run history</p>
              {agent.runs(detail.id).length === 0 ? (
                <p className="text-[11.5px] text-ink-500">No runs yet. Press “Run now” to do the first one.</p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                  {agent.runs(detail.id).map((r) => (
                    <li key={r.id} className="rounded-lg border border-white/8 bg-navy-950/40 px-2.5 py-2">
                      <div className="flex justify-between text-[10px] text-ink-600"><span>{r.trigger}</span><span>{fmtDate(r.at)}</span></div>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-ink-300">{r.summary}</p>
                      {r.items?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.items.map((it, i) => <span key={i} className="rounded bg-white/6 px-1.5 py-0.5 text-[9.5px] text-ink-400">{it.label}: {it.value}</span>)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { runAgent(detail, ctx, { manual: true }); toast('Agent ran.', 'success'); setDetail({ ...agentStore.get(detail.id) }) }}><Play size={12} /> Run now</Button>
              <Button size="sm" variant="secondary" onClick={() => { toggle(detail); setDetail({ ...agentStore.get(detail.id) }) }}>{detail.enabled ? 'Pause' : 'Enable'}</Button>
              <Button size="sm" variant="secondary" onClick={() => setDetail(null)}><ChevronDown size={12} /> Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
