import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { db, uid, nowISO } from '../lib/db.js'

/**
 * Guest sessions.
 *
 * A guest is not an account: nothing is stored on the server about them, there is
 * no password and no profile. The browser keeps a random id so that orders placed
 * from this device can be listed on a "my orders" page. Logging in is never
 * required to print — the existing account system is untouched and still works
 * alongside this.
 */
const GuestCtx = createContext(null)
const KEY = 'smartqr:guestId'

const makeId = () => `guest_${(crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 12)}`

export function GuestProvider({ children }) {
  const [guestId, setGuestId] = useState(() => {
    try {
      const existing = localStorage.getItem(KEY)
      if (existing) return existing
      const fresh = makeId()
      localStorage.setItem(KEY, fresh)
      return fresh
    } catch {
      return makeId()
    }
  })

  // Orders placed as a guest are tagged with this id in the data layer.
  useEffect(() => {
    try {
      localStorage.setItem(KEY, guestId)
    } catch {
      /* private mode — the session simply won't survive a reload */
    }
  }, [guestId])

  const value = useMemo(() => ({ guestId, isGuest: true, reset: () => setGuestId(makeId()) }), [guestId])
  return <GuestCtx.Provider value={value}>{children}</GuestCtx.Provider>
}

export const useGuest = () => useContext(GuestCtx) || { guestId: null, isGuest: true }

/** Shared guest labels so orders and receipts read consistently. */
export const guestDisplayName = () => 'Guest customer'

export const newOrderId = () => `ord_${Date.now().toString().slice(-6)}`

export const guestOrderTag = (guestId) => `guest:${guestId}:${uid('x').slice(-4)}`

export { db, nowISO }
