import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useData } from './DataContext.jsx'
import { agentStore, tickAgents, notifications, isDue, runStudyQuestionAgent } from '../lib/agent.js'

const AgentCtx = createContext(null)

/**
 * Keeps the SMART AI AGENT alive while the app is open.
 *
 * - A heartbeat checks every 30s for agents that are due and runs them.
 * - Returning to the tab (visibilitychange) runs a catch-up pass immediately.
 * - `status` is honest: it says where the engine is running, not that work
 *   happened while the browser was closed.
 */
export function AgentProvider({ children }) {
  const { user } = useAuth()
  const data = useData()
  const [status, setStatus] = useState({ engine: 'idle', lastTick: null, tickCount: 0, ran: 0 })
  const [unread, setUnread] = useState(0)
  const startedRef = useRef(Date.now())

  const buildContext = useCallback(() => {
    if (!user || user.role !== 'student') return null
    return {
      userId: user.id,
      orders: data.orders(),
      notes: data.notes(),
      documents: data.documents(),
      shops: data.shops(),
      printers: data.printers(),
    }
  }, [user, data, data.tick])

  const tick = useCallback(() => {
    const ctx = buildContext()
    if (!ctx) {
      setStatus((s) => ({ ...s, engine: 'idle', lastTick: new Date().toISOString() }))
      return 0
    }
    const ran = tickAgents(ctx)
    // model-backed agents run asynchronously so the heartbeat never blocks
    const due = agentStore.list().filter((a) => a.userId === ctx.userId && a.kind === 'study-question' && isDue(a))
    due.forEach((a) => runStudyQuestionAgent(a, ctx))
    setStatus((s) => ({ engine: 'running', lastTick: new Date().toISOString(), tickCount: s.tickCount + 1, ran }))
    setUnread(notifications.unread())
    return ran
  }, [buildContext])

  // heartbeat while the app is open
  useEffect(() => {
    if (!user || user.role !== 'student') return
    setStatus((s) => ({ ...s, engine: 'running', startedAt: startedRef.current }))
    tick()
    const id = setInterval(tick, 30000)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [user, tick])

  // refresh the badge whenever the store changes
  useEffect(() => {
    const on = () => setUnread(notifications.unread())
    window.addEventListener('smartqr:changed', on)
    return () => window.removeEventListener('smartqr:changed', on)
  }, [])

  const value = useMemo(() => ({
    status,
    unread,
    tick,
    agents: () => agentStore.list().filter((a) => !user || a.userId === user.id),
    runs: (id) => agentStore.runs(id),
    allRuns: () => agentStore.allRuns(),
    notifications: () => notifications.list(),
    markAllRead: () => { notifications.markAllRead(); setUnread(0) },
    clearNotifications: () => { notifications.clear(); setUnread(0) },
  }), [status, unread, tick, user])

  return <AgentCtx.Provider value={value}>{children}</AgentCtx.Provider>
}

export const useAgent = () => useContext(AgentCtx)
