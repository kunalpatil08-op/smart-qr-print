import { fmtMoney } from './db.js'

export const DEFAULT_PRICING = {
  bwSingle: 1.5,
  bwDouble: 1.0,
  colorSingle: 6.0,
  colorDouble: 4.5,
  a3Multiplier: 2.0,
  binding: 15.0,
}

export const PAPER_SIZES = [
  { id: 'A4', label: 'A4 (210 × 297 mm)' },
  { id: 'A3', label: 'A3 (297 × 420 mm)' },
  { id: 'Letter', label: 'Letter (8.5 × 11 in)' },
]

/**
 * Pure, deterministic price calculation. On the server the same logic runs
 * inside create_order() so the client cannot tamper with the total.
 */
export function calculatePrice({ pages, copies, color, duplex, paper, binding, pricing }) {
  const p = { ...DEFAULT_PRICING, ...(pricing || {}) }
  const perPage = color
    ? duplex
      ? p.colorDouble
      : p.colorSingle
    : duplex
      ? p.bwDouble
      : p.bwSingle
  const paperMult = paper === 'A3' ? p.a3Multiplier : 1
  const sheets = duplex ? Math.ceil(pages / 2) : pages
  const printing = perPage * sheets * copies * paperMult
  const bindingCost = binding ? p.binding * copies : 0
  const subtotal = printing + bindingCost
  const tax = Math.round(subtotal * 0.0) // GST placeholder: shop-configurable
  return {
    perPage,
    paperMult,
    sheets,
    copies,
    printing: round(printing),
    binding: round(bindingCost),
    subtotal: round(subtotal),
    tax,
    total: round(subtotal + tax),
    breakdown: `${fmtMoney(round(perPage * paperMult))} × ${sheets} sheet${sheets > 1 ? 's' : ''} × ${copies} cop${copies > 1 ? 'ies' : 'y'}${binding ? ' + binding' : ''}`,
  }
}

const round = (n) => Math.round(n * 100) / 100

export const parsePageRanges = (input, totalPages) => {
  const total = Math.max(1, Math.floor(Number(totalPages) || 1))
  // Blank = every page, whatever the total. Ranges clamp, reversed ranges flip,
  // out-of-range pages are dropped, anything over the total is capped silently.
  if (!input || !input.trim()) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set()
  for (const chunk of String(input).split(',')) {
    const part = chunk.trim()
    if (!part) continue
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) {
      let a = Math.max(1, +m[1]), b = Math.max(1, +m[2])
      if (a > b) [a, b] = [b, a]
      for (let i = a; i <= Math.min(b, total); i++) set.add(i)
    } else if (/^\d+$/.test(part)) {
      const n = +part
      if (n >= 1 && n <= total) set.add(n)
    }
  }
  // "5" or a typo that selects nothing still prints everything — never a 0-page order.
  if (set.size === 0) return Array.from({ length: total }, (_, i) => i + 1)
  return [...set].sort((a, b) => a - b)
}
