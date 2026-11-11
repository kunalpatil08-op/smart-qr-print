/**
 * Payment layer.
 *
 * DEMO and LIVE are kept strictly apart:
 *  - demo transactions live in their own store (`demoTransactions`), carry
 *    mode: 'demo' and a `TEST-` reference, and can never move an order past
 *    "payment pending". A print job is only released by a verified LIVE payment.
 *  - live is not configured in this build; the same interface is ready for a
 *    Razorpay / Stripe checkout + webhook (see `startLivePayment`).
 */

import { db, uid, nowISO } from './db.js'

export const PAYMENT_MODES = { DEMO: 'demo', LIVE: 'live' }

/** Razorpay/Stripe wiring point. Nothing here pretends to succeed. */
export const livePaymentProvider = {
  configured: Boolean(import.meta.env.VITE_PAYMENT_KEY_ID),
  provider: import.meta.env.VITE_PAYMENT_PROVIDER || 'razorpay',
  keyId: import.meta.env.VITE_PAYMENT_KEY_ID || '',
}

export function demoTransactionId() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TEST-${stamp}-${rand}`
}

/** Deterministic demo OTP so the same transaction always shows the same code. */
export function demoTxnOtp(id) {
  let h = 0
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) >>> 0
  return String(100000 + (h % 900000))
}

/**
 * A believable demo card number, derived from the transaction id so it is stable.
 * 4242 is Stripe's well-known test prefix — unmistakably a test card.
 */
export function demoCardFor(id) {
  const otp = demoTxnOtp(id)
  return `4242 4242 4242 ${otp.slice(-4)}`
}

export const demoTransactions = {
  list: () => db.read('demoTransactions', []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  forOrder: (orderId) => demoTransactions.list().filter((t) => t.orderId === orderId),
  add(tx) {
    const rec = { id: demoTransactionId(), mode: 'demo', createdAt: nowISO(), ...tx }
    db.write('demoTransactions', [rec, ...db.read('demoTransactions', [])].slice(0, 200))
    return rec
  },
}

/** Records a simulated payment. Never touches the order's real payment field. */
export function runDemoPayment({ order, outcome, method = 'UPI (demo)', last4 }) {
  const amount = Number(order.amount) || 0
  const base = {
    orderId: order.id,
    orderRef: order.id.replace('ord_', ''),
    shopId: order.shopId,
    shopName: order.shopName || '',
    docName: order.docName,
    amount,
    method,
    last4,
    outcome,
    label: 'TEST PAYMENT – NO REAL MONEY PAID',
  }
  if (outcome === 'success') {
    return demoTransactions.add({ ...base, status: 'demo_paid', failureReason: null })
  }
  return demoTransactions.add({
    ...base,
    status: 'demo_failed',
    failureReason:
      outcome === 'declined' ? 'Payment declined by the (simulated) bank.' : 'The (simulated) gateway timed out.',
  })
}

/**
 * Where a live payment would start. Returns { configured:false } in this build —
 * the UI shows that plainly instead of a fake success.
 */
export async function startLivePayment(order) {
  if (!livePaymentProvider.configured) return { configured: false }
  // Production: create a server-side order, open the provider's checkout,
  // then confirm only after the signed webhook verifies it.
  return { configured: true, pending: true }
}

export const isDemoMode = () => db.read('paymentMode', 'demo') === 'demo'
export const setPaymentMode = (mode) => db.write('paymentMode', mode === 'live' ? 'live' : 'demo')
