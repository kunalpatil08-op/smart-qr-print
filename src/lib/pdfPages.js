import { useEffect, useRef, useState } from 'react'

/**
 * Counts pages in a real PDF by using the browser's own PDF engine.
 * Much more reliable than scanning file bytes for "/Type /Page", which misses
 * pages in compressed (object-stream) PDFs and counts wrong for big files.
 *
 * Implementation: render the file with PDF.js (pdfjs-dist, already the
 * industry-standard way to read PDFs in the browser). The worker is pinned
 * from a CDN with local fallback to pdf.worker.min.mjs in /public.
 */
const CDN_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs'
const LOCAL_WORKER = '/pdf.worker.min.mjs'

let pdfjsPromise = null

async function loadPdfJs() {
  if (pdfjsPromise) return pdfjsPromise
  pdfjsPromise = (async () => {
    try {
      // Prefer the installed package so the version stays in sync with the lockfile.
      const mod = await import('pdfjs-dist')
      mod.GlobalWorkerOptions.workerSrc = LOCAL_WORKER
      return mod
    } catch {
      // No local install (e.g. preview builds) — fall back to the CDN bundle.
      const mod = await import(/* @vite-ignore */ CDN_WORKER)
      mod.GlobalWorkerOptions.workerSrc = CDN_WORKER
      return mod
    }
  })()
  return pdfjsPromise
}

/**
 * @param {File} file
 * @returns {Promise<number>} page count, or 0 when it could not be determined
 */
export async function countPdfPages(file) {
  if (!file) return 0
  const pdfjs = await loadPdfJs()
  const buf = await file.arrayBuffer()
  const task = pdfjs.getDocument({ data: new Uint8Array(buf) })
  try {
    const pdf = await task.promise
    const n = pdf.numPages || 0
    try { await pdf.destroy() } catch { /* ignore */ }
    return n
  } catch {
    try { task.destroy() } catch { /* ignore */ }
    return 0
  }
}

/**
 * @param {File} file
 * @returns {Promise<number>} trusted total page count (>=1), best-effort fallback
 */
export async function safePageCount(file, fallback = 1) {
  try {
    const n = await countPdfPages(file)
    if (Number.isFinite(n) && n >= 1) return n
  } catch { /* fall through */ }
  return fallback
}

/**
 * Hook: given a File, keeps its counted page total.
 * Counts once per file and ignores stale results.
 */
export function usePdfPageCount(file) {
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    if (!file) { setCount(0); setBusy(false); return }
    const id = ++seq.current
    setBusy(true)
    safePageCount(file).then((n) => {
      if (seq.current !== id) return
      setCount(n)
      setBusy(false)
    })
    return () => { /* stale results ignored via seq */ }
  }, [file])

  return { count, busy, setCount }
}
