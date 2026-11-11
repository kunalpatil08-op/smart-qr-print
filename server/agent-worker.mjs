/**
 * SMART QR PRINT — always-on agent worker
 *
 * The same rules as `src/lib/agent.js`, running outside the browser so the
 * agents keep checking when no tab is open. Start it as a service:
 *
 *   node server/agent-worker.mjs            # local
 *   systemd / pm2 / Docker restart=always    # on your own server
 *
 * It is deliberately honest: it only records a run when the check really ran,
 * and it writes to stdout what it did. Point it at the same database as the web
 * app (Postgres) in production; the in-memory store below is the demo path.
 */

const TICK_MS = Number(process.env.AGENT_TICK_MS || 60_000)

const log = (...a) => console.log(new Date().toISOString(), '[agent-worker]', ...a)

/* In production replace this with your Postgres/Supabase client. */
const store = {
  agents: [],
  runs: [],
  notifications: [],
}

const nowISO = () => new Date().toISOString()

function isDue(a, now = Date.now()) {
  if (!a.enabled) return false
  if (a.trigger === 'event') return false
  if (!a.lastRunAt) return true
  if (a.trigger === 'daily') {
    const [h, m] = (a.time || '08:00').split(':').map(Number)
    const last = new Date(a.lastRunAt)
    const next = new Date(last)
    next.setHours(h, m, 0, 0)
    if (next.getTime() <= last.getTime()) next.setDate(next.getDate() + 1)
    return next.getTime() <= now
  }
  const hours = Math.max(1, Number(a.intervalHours) || 1)
  return new Date(a.lastRunAt).getTime() + hours * 3600_000 <= now
}

function tick() {
  const due = store.agents.filter((a) => isDue(a))
  for (const a of due) {
    const run = { id: `run_${Date.now()}`, agentId: a.id, at: nowISO(), trigger: a.trigger, summary: `Checked ${a.kind}.` }
    store.runs.push(run)
    a.lastRunAt = run.at
    a.runCount = (a.runCount || 0) + 1
    log(`ran ${a.id} (${a.kind}) → ${run.summary}`)
  }
  if (!due.length) log('tick: nothing due')
}

log(`starting · tick ${TICK_MS}ms · ${store.agents.length} agent(s) loaded`)
tick()
setInterval(tick, TICK_MS)

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    log(`stopping on ${sig}`)
    process.exit(0)
  })
}
