/**
 * Local persistence layer.
 *
 * In production this module is replaced by Supabase (PostgreSQL + Row Level
 * Security + Storage + Edge Functions). Every function below mirrors the shape
 * of the equivalent Supabase call so the swap is mechanical. See
 * /src/lib/supabase.js for the wired-up production adapter and
 * /supabase/schema.sql for the database schema and policies.
 */

const NS = 'smartqr:'

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const write = (key, value) => {
  localStorage.setItem(NS + key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('smartqr:changed', { detail: key }))
  return value
}

export const db = { read, write }

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const nowISO = () => new Date().toISOString()

export const fmtMoney = (n) =>
  '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (iso, opts) =>
  new Date(iso).toLocaleString('en-IN', opts || { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return fmtDate(iso, { day: '2-digit', month: 'short' })
}

export const ORDER_STAGES = [
  'uploaded',
  'payment_pending',
  'payment_verified',
  'in_queue',
  'printing',
  'completed',
]

export const STAGE_LABELS = {
  uploaded: 'Uploaded',
  payment_pending: 'Payment pending',
  payment_verified: 'Payment verified',
  in_queue: 'In queue',
  printing: 'Printing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}
