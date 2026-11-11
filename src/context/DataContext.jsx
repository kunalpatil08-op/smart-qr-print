import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { db, uid, nowISO } from '../lib/db.js'
import { useAuth } from './AuthContext.jsx'
import { fireEvent } from '../lib/agent.js'
import { useGuest } from './GuestContext.jsx'

const DataCtx = createContext(null)

export function DataProvider({ children }) {
  const { user } = useAuth()
  const { guestId } = useGuest()
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => t + 1), [])

  // Retention policy: temporary uploads disappear when their window ends.
  // Order records are kept — only the file reference/metadata is cleared.
  useEffect(() => {
    try {
      const docs = db.read('documents', [])
      const now = Date.now()
      const expired = docs.filter((d) => d.expiresAt && new Date(d.expiresAt).getTime() < now)
      if (expired.length) {
        const ids = new Set(expired.map((d) => d.id))
        db.write('documents', docs.filter((d) => !ids.has(d.id)))
        db.write('purgedFiles', [
          ...(db.read('purgedFiles', []) || []),
          ...expired.map((d) => ({ id: d.id, name: d.name, purgedAt: nowISO() })),
        ].slice(-100))
      }
    } catch {
      /* storage unavailable — nothing to purge */
    }
  }, [])

  useEffect(() => {
    const onChange = () => bump()
    window.addEventListener('smartqr:changed', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('smartqr:changed', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [bump])

  const api = useMemo(() => {
    const get = (k, f) => db.read(k, f)
    const set = (k, v) => { db.write(k, v); return v }

    const myDocs = () => get('documents', []).filter((d) => !user || d.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const myNotes = () => get('notes', []).filter((n) => !user || n.userId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const myConvos = () => get('conversations', []).filter((c) => !user || c.userId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const myOrders = () =>
      get('orders', [])
        .filter((o) => (user ? o.userId === user.id : o.guestId && o.guestId === guestId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const orderById = (id) => get('orders', []).find((o) => o.id === id) || null
    const shopOrders = (shopId) => get('orders', []).filter((o) => !shopId || o.shopId === shopId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const printers = (shopId) => get('printers', []).filter((p) => !shopId || p.shopId === shopId)
    const shops = () => get('shops', [])
    const shop = (id) => get('shops', []).find((s) => s.id === id)

    return {
      tick,
      documents: myDocs,
      notes: myNotes,
      conversations: myConvos,
      orders: myOrders,
      orderById,
      shopOrders,
      printers,
      shops,
      shop,
      events: (orderId) => get('orderEvents', {})[orderId] || [],

      addDocument(doc) {
        const list = get('documents', [])
        const rec = { id: uid('doc'), userId: user.id, createdAt: nowISO(), source: 'upload', status: 'stored', ...doc }
        set('documents', [rec, ...list])
        return rec
      },
      removeDocument(id) {
        set('documents', get('documents', []).filter((d) => d.id !== id))
      },
      updateDocument(id, patch) {
        set('documents', get('documents', []).map((d) => (d.id === id ? { ...d, ...patch } : d)))
      },

      saveNote(note) {
        const list = get('notes', [])
        if (note.id) {
          const next = list.map((n) => (n.id === note.id ? { ...n, ...note, updatedAt: nowISO() } : n))
          set('notes', next)
          return note
        }
        const rec = { id: uid('note'), userId: user.id, createdAt: nowISO(), updatedAt: nowISO(), ...note }
        set('notes', [rec, ...list])
        fireEvent('note_saved', {}, { summary: `Note saved: ${rec.title} (${rec.subject || 'General'}).` })
        return rec
      },
      deleteNote(id) {
        set('notes', get('notes', []).filter((n) => n.id !== id))
      },

      createConversation(conv) {
        const rec = { id: uid('conv'), userId: user.id, createdAt: nowISO(), updatedAt: nowISO(), messages: [], ...conv }
        set('conversations', [rec, ...get('conversations', [])])
        return rec
      },
      updateConversation(id, patch) {
        set('conversations', get('conversations', []).map((c) => (c.id === id ? { ...c, ...patch, updatedAt: nowISO() } : c)))
      },
      deleteConversation(id) {
        set('conversations', get('conversations', []).filter((c) => c.id !== id))
      },

      createOrder(order) {
        const rec = {
          id: `ord_${Date.now().toString().slice(-6)}`,
          userId: user?.id || null,
          guestId: user ? null : guestId,
          isGuestOrder: !user,
          customerName: user?.name || 'Guest customer',
          status: 'payment_pending',
          createdAt: nowISO(),
          updatedAt: nowISO(),
          payment: null,
          ...order,
        }
        const list = get('orders', [])
        set('orders', [rec, ...list])
        this.logEvent(rec.id, 'uploaded', 'Document uploaded and order created')
        fireEvent('order_status', {}, { summary: `New order for ${rec.docName} (${rec.status.replace('_', ' ')}).`, notify: null })
        return rec
      },
      logEvent(orderId, status, note) {
        const all = get('orderEvents', {})
        const list = all[orderId] || []
        set('orderEvents', { ...all, [orderId]: [...list, { id: uid('ev'), status, note, at: nowISO() }] })
      },
      advanceOrder(orderId, status, note) {
        const list = get('orders', [])
        const order = list.find((o) => o.id === orderId)
        if (!order) return
        set('orders', list.map((o) => (o.id === orderId ? { ...o, status, updatedAt: nowISO() } : o)))
        this.logEvent(orderId, status, note || `Status changed to ${status.replace('_', ' ')}`)
        fireEvent('order_status', {}, { summary: `${order.docName} is now ${status.replace('_', ' ')}.`, items: [{ label: 'Order', value: `#${orderId.replace('ord_', '')}` }, { label: 'Status', value: status.replace('_', ' ') }] })
        if (status === 'failed') {
          fireEvent('order_failed', {}, { summary: `${order.docName} failed: ${note || 'reason not given'}.`, notify: { title: 'Print job failed', body: `${order.docName} — ${note || 'open your orders for details.'}`, tone: 'error' } })
        }
      },
      setOrder(orderId, patch) {
        set('orders', get('orders', []).map((o) => (o.id === orderId ? { ...o, ...patch, updatedAt: nowISO() } : o)))
      },
      updateShop(shopId, patch) {
        set('shops', get('shops', []).map((s) => (s.id === shopId ? { ...s, ...patch } : s)))
      },
      updatePrinter(id, patch) {
        set('printers', get('printers', []).map((p) => (p.id === id ? { ...p, ...patch } : p)))
      },
      addPrinter(shopId, printer) {
        set('printers', [...get('printers', []), { id: uid('prn'), shopId, status: 'online', queue: 0, toner: 100, ...printer }])
      },
    }
  }, [user, guestId, tick])

  return <DataCtx.Provider value={api}>{children}</DataCtx.Provider>
}

export const useData = () => useContext(DataCtx)
