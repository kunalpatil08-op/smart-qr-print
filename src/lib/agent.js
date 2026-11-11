/**
 * SMART AI AGENT — the always-on agent runtime.
 *
 * An agent is a job with a goal, a trigger and a schedule. This module owns the
 * run engine, the trigger evaluator, the run history and the notification feed.
 *
 * WHERE IT RUNS
 *  - In the browser, as long as a SMART QR PRINT tab is open (module-level
 *    heartbeat + visibility wake-ups). Runs are written to the store, so the
 *    agent picks up exactly where it left off when a tab comes back.
 *  - 24/7, with no browser open, when the app is deployed with the Node worker
 *    in `server/agent-worker.mjs` (same engine, same rules, runs as a service).
 *    Nothing here claims to have run while both are down: a run only exists
 *    once its work was actually done.
 */

import { db, uid, nowISO } from './db.js'
import { askAgent } from './ai.js'

export const AGENT_KINDS = [
  {
    id: 'print-monitor',
    name: 'Print Order Monitor',
    icon: 'printer',
    tone: 'blue',
    description: 'Watches your print orders and tells you when a job moves forward, stalls or fails.',
    defaultSchedule: 2,
    permission: 'read:orders',
    what: 'Reads your own print orders. Cannot change them.',
  },
  {
    id: 'exam-planner',
    name: 'Exam Revision Planner',
    icon: 'calendar',
    tone: 'violet',
    description: 'Builds a day-by-day revision plan from your saved notes and tracks the streak.',
    defaultSchedule: 24,
    permission: 'read:notes, write:notes',
    what: 'Reads and creates notes in your library.',
  },
  {
    id: 'study-buddy',
    name: 'Study Buddy Reminder',
    icon: 'bell',
    tone: 'green',
    description: 'A gentle nudge at a set hour when you have notes due for revision.',
    defaultSchedule: 12,
    permission: 'read:notes',
    what: 'Reads note dates. Sends in-app reminders.',
  },
  {
    id: 'doc-hygiene',
    name: 'Document Caretaker',
    icon: 'file',
    tone: 'amber',
    description: 'Flags documents about to expire and tells you what is worth keeping.',
    defaultSchedule: 6,
    permission: 'read:documents',
    what: 'Reads document metadata. Never deletes anything.',
  },
  {
    id: 'study-question',
    name: 'Study Question Agent',
    icon: 'question',
    tone: 'green',
    description: 'Answers a question you leave for it, on your schedule, and files the answer as a study note.',
    defaultSchedule: 12,
    permission: 'read:question, write:notes, ai:generate',
    what: 'Calls Gemini Flash once per run and saves the answer as a note.',
    needsQuestion: true,
  },
  {
    id: 'queue-watch',
    name: 'Shop Queue Watcher',
    icon: 'store',
    tone: 'violet',
    description: 'Reports queue depth and printer health for the shop you print at most.',
    defaultSchedule: 4,
    permission: 'read:printers',
    what: 'Reads shop printer states.',
  },
]

export const TRIGGERS = [
  { id: 'interval', label: 'Every N hours' },
  { id: 'daily', label: 'Daily at a time' },
  { id: 'event', label: 'When something happens' },
]

export const EVENTS = [
  { id: 'order_status', label: 'A print order changes status' },
  { id: 'note_saved', label: 'A note is saved' },
  { id: 'order_failed', label: 'A print order fails' },
]

const kind = (id) => AGENT_KINDS.find((k) => k.id === id) || AGENT_KINDS[0]

/* ------------------------------------------------------------------ store - */

export const agentStore = {
  list: () => db.read('agents', []),
  get: (id) => db.read('agents', []).find((a) => a.id === id),
  save(agent) {
    const list = db.read('agents', [])
    const rec = agent.id ? agent : { id: uid('agt'), createdAt: nowISO(), runCount: 0, lastRunAt: null, lastResult: null, ...agent }
    db.write('agents', agent.id ? list.map((a) => (a.id === agent.id ? { ...a, ...agent } : a)) : [rec, ...list])
    return rec
  },
  remove(id) {
    db.write('agents', db.read('agents', []).filter((a) => a.id !== id))
    db.write('agentRuns', db.read('agentRuns', {}))
  },
  runs: (agentId) => (db.read('agentRuns', {})[agentId] || []).slice().reverse(),
  allRuns() {
    const all = db.read('agentRuns', {})
    return Object.entries(all).flatMap(([agentId, runs]) => runs.map((r) => ({ ...r, agentId }))).sort((a, b) => b.at.localeCompare(a.at))
  },
  logRun(agentId, run) {
    const all = db.read('agentRuns', {})
    const list = all[agentId] || []
    db.write('agentRuns', { ...all, [agentId]: [...list.slice(-99), run] })
  },
}

/* ----------------------------------------------------------- notifications - */

export const notifications = {
  list: () => db.read('notifications', []),
  push({ title, body, tone = 'info', agentId }) {
    const list = db.read('notifications', [])
    const rec = { id: uid('ntf'), title, body, tone, agentId, at: nowISO(), read: false }
    db.write('notifications', [rec, ...list].slice(0, 60))
    return rec
  },
  markAllRead() {
    db.write('notifications', db.read('notifications', []).map((n) => ({ ...n, read: true })))
  },
  clear() {
    db.write('notifications', [])
  },
  unread: () => db.read('notifications', []).filter((n) => !n.read).length,
}

/* -------------------------------------------------------------- scheduling - */

export function nextRunAt(agent) {
  const from = agent.lastRunAt ? new Date(agent.lastRunAt).getTime() : new Date(agent.createdAt || Date.now()).getTime()
  if (agent.trigger === 'daily') {
    const [h, m] = (agent.time || '08:00').split(':').map(Number)
    const d = new Date(from)
    d.setHours(h, m, 0, 0)
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
    return d.toISOString()
  }
  if (agent.trigger === 'event') return null
  const hours = Math.max(1, Number(agent.intervalHours) || 1)
  return new Date(Math.max(from, Date.now() - 1000) + hours * 3600000).toISOString()
}

export function isDue(agent) {
  if (!agent.enabled) return false
  if (agent.trigger === 'event') return false
  if (!agent.lastRunAt) return true
  const next = nextRunAt(agent)
  return next ? new Date(next).getTime() <= Date.now() : false
}

/* ------------------------------------------------------------------ tasks - */

/**
 * The work each agent actually does. Pure functions over the user's own data —
 * no external calls, no invented facts. Returns { summary, items[], notify? }.
 */
const TASKS = {
  'print-monitor': ({ orders, events }) => {
    const active = orders.filter((o) => ['uploaded', 'payment_pending', 'payment_verified', 'in_queue', 'printing'].includes(o.status))
    const failed = orders.filter((o) => o.status === 'failed')
    const stalled = active.filter((o) => Date.now() - new Date(o.updatedAt).getTime() > 45 * 60000)
    const items = [
      { label: 'Active orders', value: String(active.length) },
      { label: 'Awaiting payment', value: String(orders.filter((o) => o.status === 'payment_pending').length) },
      { label: 'Failed jobs', value: String(failed.length) },
      { label: 'Stalled > 45 min', value: String(stalled.length) },
    ]
    const summary = active.length
      ? `${active.length} order(s) in flight — ${active.map((o) => `${o.docName.slice(0, 22)} (${o.status.replace('_', ' ')})`).slice(0, 3).join(', ')}.`
      : 'No print orders are in flight right now.'
    const notify = failed.length
      ? { title: 'A print job failed', body: failed[0].failureReason || 'Open your orders to see what happened.', tone: 'error' }
      : stalled.length
        ? { title: 'An order looks stalled', body: `${stalled[0].docName} has not moved for over 45 minutes.`, tone: 'warning' }
        : null
    return { summary, items, notify }
  },

  'exam-planner': ({ notes }) => {
    const now = Date.now()
    const due = notes.filter((n) => now - new Date(n.updatedAt).getTime() > 3 * 86400000)
    const bySubject = due.reduce((m, n) => ({ ...m, [n.subject || 'General']: (m[n.subject || 'General'] || 0) + 1 }), {})
    const items = Object.entries(bySubject).map(([s, n]) => ({ label: s, value: `${n} due` }))
    const summary = due.length
      ? `${due.length} note(s) are older than 3 days: ${Object.entries(bySubject).map(([s, n]) => `${s} ×${n}`).join(', ')}. Suggested order: hardest subject first, 25-minute blocks.`
      : 'Every saved note has been touched in the last 3 days — the revision plan is on track.'
    const notify = due.length ? { title: 'Revision plan ready', body: `${due.length} note(s) are due for revision. Open Notes to start.`, tone: 'info' } : null
    return { summary, items, notify }
  },

  'study-buddy': ({ notes }) => {
    const today = notes.filter((n) => new Date(n.updatedAt).toDateString() === new Date().toDateString())
    const total = notes.length
    const summary = total === 0
      ? 'No notes saved yet — generate your first set so reminders have something to point at.'
      : `${total} note(s) in the library, ${today.length} touched today. ${today.length ? 'Nice consistency.' : 'A short revision block today would keep the streak.'}`
    return {
      summary,
      items: [{ label: 'Notes', value: String(total) }, { label: 'Touched today', value: String(today.length) }],
      notify: today.length === 0 && total > 0 ? { title: 'Study reminder', body: 'No notes revised today. 20 minutes now beats 3 hours the night before.', tone: 'info' } : null,
    }
  },

  'doc-hygiene': ({ documents }) => {
    const soon = documents.filter((d) => d.expiresAt && new Date(d.expiresAt).getTime() - Date.now() < 12 * 3600000)
    const big = documents.slice().sort((a, b) => (b.size || 0) - (a.size || 0)).slice(0, 1)[0]
    const summary = soon.length
      ? `${soon.length} document(s) expire within 12 hours: ${soon.map((d) => d.name).slice(0, 3).join(', ')}. Print or re-upload what you still need.`
      : `All ${documents.length} document(s) are inside their retention window.`
    return {
      summary,
      items: [
        { label: 'Stored', value: String(documents.length) },
        { label: 'Expiring soon', value: String(soon.length) },
        { label: 'Largest', value: big ? `${big.name.slice(0, 24)}` : '—' },
      ],
      notify: soon.length ? { title: 'Documents expiring soon', body: `${soon.length} file(s) will be deleted on schedule.`, tone: 'warning' } : null,
    }
  },

  'queue-watch': ({ shops, printers, orders }) => {
    const counts = orders.reduce((m, o) => ({ ...m, [o.shopId]: (m[o.shopId] || 0) + 1 }), {})
    const favId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const shop = shops.find((s) => s.id === favId) || shops[0]
    if (!shop) return { summary: 'No printing shop is registered yet.', items: [] }
    const ps = printers.filter((p) => p.shopId === shop.id)
    const online = ps.filter((p) => p.status === 'online').length
    const maintenance = ps.filter((p) => p.status === 'maintenance').length
    const summary = `${shop.name} is ${shop.open ? 'open' : 'closed'} · ${online}/${ps.length} printers online${maintenance ? `, ${maintenance} in maintenance` : ''}.`
    return {
      summary,
      items: [
        { label: 'Shop', value: shop.name },
        { label: 'Printers online', value: `${online}/${ps.length}` },
        { label: 'In maintenance', value: String(maintenance) },
      ],
      notify: maintenance ? { title: 'Printer in maintenance', body: `${maintenance} printer(s) at ${shop.name} are out of service.`, tone: 'warning' } : null,
    }
  },
}

/* ------------------------------------------------------------- run engine - */

export function runAgent(agent, ctx, { manual = false } = {}) {
  const task = TASKS[agent.kind] || TASKS['print-monitor']
  let result
  try {
    result = task(ctx)
  } catch (e) {
    result = { summary: `Run failed: ${e.message}`, items: [] }
  }
  const run = {
    id: uid('run'),
    at: nowISO(),
    trigger: manual ? 'manual' : agent.trigger,
    summary: result.summary,
    items: result.items || [],
    ok: true,
  }
  agentStore.logRun(agent.id, run)
  agentStore.save({
    id: agent.id,
    lastRunAt: run.at,
    lastResult: result.summary,
    runCount: (agent.runCount || 0) + 1,
    nextRunAt: agent.trigger === 'event' ? null : nextRunAt({ ...agent, lastRunAt: run.at }),
  })
  if (result.notify) notifications.push({ ...result.notify, agentId: agent.id })
  return run
}

/**
 * The one agent kind that uses the model. Kept async and separate so the
 * rule-based agents stay instant and never depend on the AI being up.
 */
export async function runStudyQuestionAgent(agent, ctx) {
  const question = (agent.question || '').trim()
  if (!question) {
    const run = { id: uid('run'), at: nowISO(), trigger: 'manual', summary: 'No question set on this agent — nothing to ask.', items: [], ok: false }
    agentStore.logRun(agent.id, run)
    return run
  }
  const started = Date.now()
  try {
    const res = await askAgent({ question, subject: agent.subject || 'General', saveAsNote: true })
    if (!res.configured) throw new Error(res.message || 'AI is not configured on this deployment.')
    const run = {
      id: uid('run'),
      at: nowISO(),
      trigger: 'model',
      summary: res.answer.slice(0, 400),
      items: [
        { label: 'Model', value: res.model || 'gemini-2.5-flash' },
        { label: 'Latency', value: `${Math.round((Date.now() - started) / 100) / 10}s` },
        ...(res.usage ? [{ label: 'Tokens', value: String(res.usage.total_tokens ?? '—') }] : []),
      ],
      noteId: null,
      ok: true,
    }
    agentStore.logRun(agent.id, run)
    agentStore.save({ id: agent.id, lastRunAt: run.at, lastResult: res.answer.slice(0, 200), runCount: (agent.runCount || 0) + 1 })
    notifications.push({ title: 'Study question answered', body: res.answer.slice(0, 160), tone: 'info', agentId: agent.id })
    return { ...run, note: res.note, answer: res.answer }
  } catch (e) {
    const run = { id: uid('run'), at: nowISO(), trigger: 'model', summary: `Run failed: ${e.message}`, items: [], ok: false }
    agentStore.logRun(agent.id, run)
    agentStore.save({ id: agent.id, lastRunAt: run.at, lastResult: run.summary, runCount: (agent.runCount || 0) + 1 })
    notifications.push({ title: 'Agent run failed', body: e.message, tone: 'error', agentId: agent.id })
    return run
  }
}

/** Event-driven agents: called by the app whenever a matching event happens. */
export function fireEvent(eventId, ctx, payload) {
  const agents = agentStore.list().filter((a) => a.enabled && a.trigger === 'event' && a.event === eventId)
  agents.forEach((a) => {
    const run = { id: uid('run'), at: nowISO(), trigger: `event:${eventId}`, summary: payload?.summary || `Event ${eventId} received.`, items: payload?.items || [], ok: true }
    agentStore.logRun(a.id, run)
    agentStore.save({ id: a.id, lastRunAt: run.at, lastResult: run.summary, runCount: (a.runCount || 0) + 1 })
    if (payload?.notify) notifications.push({ ...payload.notify, agentId: a.id })
  })
}

/** Runs every due agent for a user context. Returns how many ran. */
export function tickAgents(ctx) {
  const due = agentStore.list().filter((a) => ctx.userId && a.userId === ctx.userId && isDue(a))
  due.forEach((a) => runAgent(a, ctx))
  return due.length
}
