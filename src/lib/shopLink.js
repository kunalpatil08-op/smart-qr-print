/**
 * Shop links: one trusted format, validated on the way in.
 *
 * A shop QR encodes  https://<host>/#/shop/<shopId>   (HashRouter)  or
 *                     https://<host>/shop/<shopId>    (if the host serves it)
 * Only Smart QR Print links on a known host are accepted, so a random QR code
 * (a menu, a poster, a phishing URL) is rejected instead of resolving a shop.
 */

const SHOP_ID_RE = /^shop_[a-z0-9_]{3,40}$/i

/** Hosts we trust. The current host is always trusted (dev, preview, Netlify). */
export function trustedHosts() {
  const extra = (import.meta.env?.VITE_SHOP_LINK_HOSTS || '').split(',').map((s) => s.trim()).filter(Boolean)
  return [...new Set([window.location.host, ...extra])]
}

/** Canonical, shareable link for a shop. */
export function shopLink(shopId, { origin = window.location.origin } = {}) {
  return `${origin}/#/shop/${shopId}`
}

/**
 * Parses a scanned QR payload.
 * @returns {{ ok: true, shopId: string, url: string } | { ok: false, reason: string }}
 */
export function parseShopPayload(raw) {
  const text = String(raw || '').trim()
  if (!text) return { ok: false, reason: 'The QR code was empty.' }

  // 1. A bare shop id / code (manual entry or a very simple QR)
  const code = text.replace(/^smartqr:/i, '').trim()
  if (SHOP_ID_RE.test(code)) return { ok: true, shopId: code, url: shopLink(code) }

  // 2. A URL — must be http(s) and on a trusted host
  let url
  try {
    url = new URL(text)
  } catch {
    return { ok: false, reason: 'This is not a Smart QR Print shop code. Ask the shop for its QR or its code.' }
  }
  if (!/^https?:$/.test(url.protocol)) return { ok: false, reason: 'That link is not a web address.' }

  const host = url.host
  if (!trustedHosts().includes(host)) {
    return { ok: false, reason: `That QR points to ${host}, which is not a Smart QR Print site. It was not opened.` }
  }

  // 3. Extract the shop id from /#/shop/<id> or /shop/<id>
  const hashMatch = url.hash.match(/\/shop\/([^/?#]+)/i)
  const pathMatch = url.pathname.match(/\/shop\/([^/?#]+)/i)
  const shopId = decodeURIComponent((hashMatch || pathMatch || [])[1] || '')

  if (!SHOP_ID_RE.test(shopId)) {
    return { ok: false, reason: 'This Smart QR Print link does not point to a shop.' }
  }
  return { ok: true, shopId, url: shopLink(shopId) }
}

/** Turns a shop id into the public shop page route used by the app. */
export const shopRoute = (shopId) => `/shop/${shopId}`
