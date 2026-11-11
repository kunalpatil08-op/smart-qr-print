import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { db, uid, nowISO } from '../lib/db.js'
import { seedIfEmpty } from '../lib/seed.js'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedIfEmpty()
    const session = db.read('session', null)
    if (session) {
      const users = db.read('users', [])
      const shops = db.read('shops', [])
      const found = session.role === 'shop'
        ? shops.find((s) => s.id === session.userId)
        : users.find((u) => u.id === session.userId)
      if (found) setUser({ ...found, role: session.role })
    }
    setReady(true)
  }, [])

  const login = useCallback(async (email, password, role) => {
    await new Promise((r) => setTimeout(r, 550))
    const e = email.trim().toLowerCase()
    if (role === 'shop') {
      const shop = db.read('shops', []).find((s) => s.ownerEmail.toLowerCase() === e)
      if (!shop) throw new Error('No printing shop account found for this email.')
      if (shop.ownerPassword !== password) throw new Error('Incorrect password. Please try again.')
      db.write('session', { userId: shop.id, role: 'shop' })
      setUser({ ...shop, role: 'shop' })
      return { role: 'shop' }
    }
    const found = db.read('users', []).find((u) => u.email.toLowerCase() === e)
    if (!found) throw new Error('No student account found for this email.')
    if (found.password !== password) throw new Error('Incorrect password. Please try again.')
    db.write('session', { userId: found.id, role: 'student' })
    setUser({ ...found, role: 'student' })
    return { role: 'student' }
  }, [])

  const signup = useCallback(async ({ name, email, password, college, course, year, role, shopName, address }) => {
    await new Promise((r) => setTimeout(r, 650))
    const e = email.trim().toLowerCase()
    if (role === 'shop') {
      const shops = db.read('shops', [])
      if (shops.some((s) => s.ownerEmail.toLowerCase() === e)) throw new Error('An account with this email already exists.')
      const shop = {
        id: uid('shop'), name: shopName || `${name}'s Print Shop`, ownerName: name, ownerEmail: e,
        ownerPassword: password, address: address || '', phone: '', upiId: '', open: false,
        rating: null, reviews: 0, hours: '9:00 AM – 9:00 PM',
        pricing: { bwSingle: 2, bwDouble: 1.5, colorSingle: 8, colorDouble: 6, a3Multiplier: 2, binding: 20 },
        retentionHours: 24,
      }
      db.write('shops', [...shops, shop])
      db.write('session', { userId: shop.id, role: 'shop' })
      setUser({ ...shop, role: 'shop' })
      return { role: 'shop' }
    }
    const users = db.read('users', [])
    if (users.some((u) => u.email.toLowerCase() === e)) throw new Error('An account with this email already exists.')
    const u = { id: uid('usr'), role: 'student', name, email: e, password, college, course, year, createdAt: nowISO(), monthlyPrintLimit: 400 }
    db.write('users', [...users, u])
    db.write('session', { userId: u.id, role: 'student' })
    setUser(u)
    return { role: 'student' }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('smartqr:session')
    setUser(null)
  }, [])

  const updateProfile = useCallback((patch) => {
    if (!user) return
    if (user.role === 'shop') {
      const shops = db.read('shops', []).map((s) => (s.id === user.id ? { ...s, ...patch } : s))
      db.write('shops', shops)
    } else {
      const users = db.read('users', []).map((u) => (u.id === user.id ? { ...u, ...patch } : u))
      db.write('users', users)
    }
    setUser((u) => ({ ...u, ...patch }))
  }, [user])

  const requestReset = useCallback(async (email) => {
    await new Promise((r) => setTimeout(r, 700))
    return { sent: true, email }
  }, [])

  const value = useMemo(() => ({ user, ready, login, signup, logout, updateProfile, requestReset }), [user, ready, login, signup, logout, updateProfile, requestReset])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
