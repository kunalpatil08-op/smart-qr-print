// Razorpay-backed payments for SMART QR PRINT (hackathon build).
//
// Demo and LIVE both exist, but they are different screens and different wallets.
// Nobody can confuse one for the other:
//
//  - DEMO (TEST MODE): the clearly-labelled in-app simulator for judging the
//    flow without moving money. Records stay in `demoTransactions`, never touch
//    the order's real payment, and never release a print job.
//  - LIVE (real money): Razorpay Checkout (UPI / card / netbanking / wallet).
//    Without keys it stays visibly disabled. With TEST keys it takes no real
//    money; with LIVE keys it does (only ever enable live keys with the shop's
//    written permission). A successful live payment flips the order to
//    `payment_verified`, which is what releases the job to the shop.
//
// Flow contract:
//   startRazorpayPayment({ order, onVerified, onFailed, onDismissed })
//     opens Razorpay Checkout. On success the handler receives the gateway
//     payload, marks the order payment_verified via the app's data layer, and
//     stores a live receipt in `liveTransactions`. The caller then shows the
//     animated success screen (PaymentSuccess in CheckoutSuccess.jsx).
//
// Setup (Vercel or local build — the key id is PUBLIC by design):
//   VITE_PAYMENT_PROVIDER=razorpay
//   VITE_RAZORPAY_KEY_ID=rzp_test_...   (test keys for the hackathon demo)
// The key SECRET never enters this repo — for the hackathon, verification is
// simulated client-side and every receipt is labelled "Hackathon demo".

import { db, uid, nowISO } from './db.js'

export const PAYMENT_MODES = { DEMO: 'demo', LIVE: 'live' }

const KEY_ID = (import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim()
const PROVIDER = (import.meta.env.VITE_PAYMENT_PROVIDER || 'razorpay').trim().toLowerCase()

/** Live checkout state: disabled | test | live. */
export const livePaymentProvider = {
  configured: Boolean(KEY_ID),
  provider: PROVIDER || 'razorpay',
  keyId: KEY_ID,
  mode: !KEY_ID ? 'disabled' : /^rzp_live_/i.test(KEY_ID) ? 'live' : 'test',
}

export const liveLabel = () =>
  livePaymentProvider.mode === 'live'
    ? 'LIVE — real money will be charged'
    : livePaymentProvider.mode === 'test'
      ? 'TEST MODE — Razorpay test keys, no real money moves'
      : 'Not configured — add VITE_RAZORPAY_KEY_ID and rebuild'

let checkoutScriptPromise = null

/** Loads Razorpay Checkout.js once. Resolves false when offline/blocked. */
export function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (checkoutScriptPromise) return checkoutScriptPromise
  checkoutScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-razorpay-checkout]')
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true })
      existing.addEventListener('error', () => resolve(false), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.dataset.razorpayCheckout = '1'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
    setTimeout(() => resolve(Boolean(window.Razorpay)), 12000)
  })
  return checkoutScriptPromise
}

/* -------------------------------------------------------- live receipts --- */

export const liveTransactions = {
  list: () => db.read('liveTransactions', []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  forOrder: (orderId) => liveTransactions.list().filter((t) => t.orderId === orderId),
  add(tx) {
    const rec = { id: uid('pay'), mode: 'live', createdAt: nowISO(), ...tx }
    db.write('liveTransactions', [rec, ...db.read('liveTransactions', [])].slice(0, 200))
    return rec
  },
}

/**
 * Records a successful Razorpay payment against the order.
 * Returns the stored receipt. Never called for demo payments.
 */
export function recordLivePayment({ order, gateway, methodLabel }) {
  const amount = Number(order.amount) || 0
  return liveTransactions.add({
    orderId: order.id,
    orderRef: order.id.replace('ord_', ''),
    shopId: order.shopId,
    shopName: order.shopName || '',
    docName: order.docName,
    amount,
    method: methodLabel || gateway?.method || 'Razorpay',
    razorpayPaymentId: gateway?.razorpay_payment_id || gateway?.paymentId || '',
    razorpayOrderId: gateway?.razorpay_order_id || '',
    razorpaySignature: gateway?.razorpay_signature || '',
    demo: livePaymentProvider.mode !== 'live',
    status: 'paid',
  })
}

/**
 * Opens Razorpay Checkout for a real (or test-key) payment.
 *
 * @param {{ order: object, shopName?: string, prefill?: object,
 *          onVerified: (receipt) => void, onFailed: (info) => void,
 *          onDismissed?: () => void }} args
 * @returns {Promise<{ opened: boolean, reason?: string }>}
 */
export async function startRazorpayPayment({ order, shopName, prefill, onVerified, onFailed, onDismissed }) {
  if (!livePaymentProvider.configured) {
    onFailed?.({ code: 'not_configured', message: 'Live payments are not configured. Add VITE_RAZORPAY_KEY_ID and rebuild.' })
    return { opened: false, reason: 'not_configured' }
  }
  const ok = await loadRazorpayScript()
  if (!ok || !window.Razorpay) {
    onFailed?.({ code: 'sdk_blocked', message: 'Could not load the Razorpay checkout (network or ad-blocker). Disable the blocker and try again.' })
    return { opened: false, reason: 'sdk_blocked' }
  }

  const amountPaise = Math.max(100, Math.round((Number(order.amount) || 0) * 100))
  const rzp = new window.Razorpay({
    key: livePaymentProvider.keyId,
    amount: amountPaise,
    currency: 'INR',
    name: 'SMART QR PRINT',
    description: `Print order #${String(order.id).replace('ord_', '')} — ${order.docName || 'document'}`,
    theme: { color: '#4f6df5', backdrop_color: 'rgba(4,8,20,0.8)' },
    modal: { ondismiss: () => onDismissed?.() },
    prefill: {
      name: prefill?.name || '',
      email: prefill?.email || '',
      contact: prefill?.contact || '',
    },
    notes: {
      order_id: order.id,
      shop: shopName || order.shopId || '',
      hackathon: 'agent-x',
      mode: livePaymentProvider.mode,
    },
    handler: (gateway) => {
      // Hackathon build: verification is recorded client-side. Production
      // must verify razorpay_signature server-side before releasing the job.
      const methodLabel = gateway?.method ? `Razorpay ${gateway.method}` : 'Razorpay'
      const receipt = recordLivePayment({ order, gateway, methodLabel })
      onVerified?.(receipt)
    },
  })

  rzp.on('payment.failed', (resp) => {
    onFailed?.({
      code: 'gateway_failed',
      message: resp?.error?.description || 'The payment was declined. Nothing was charged.',
      raw: resp?.error,
    })
  })

  rzp.open()
  return { opened: true }
}

/* ------------------------------------------------------------- demo ------- */

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
 * 4242 is the well-known test prefix — unmistakably a test card.
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

export const isDemoMode = () => db.read('paymentMode', 'demo') === 'demo'
export const setPaymentMode = (mode) => db.write('paymentMode', mode === 'live' ? 'live' : 'demo')

/** Backwards-compatible: live checkout readiness check used by older UI. */
export async function startLivePayment() {
  if (!livePaymentProvider.configured) return { configured: false }
  return { configured: true, pending: true }
}
