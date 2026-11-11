import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { parseShopPayload } from '../lib/shopLink.js'

/**
 * Camera QR scanning + gallery QR decoding.
 *
 * - `start()` asks for the rear camera and scans frames on a canvas.
 * - `decodeFile(file)` decodes a QR from an image the user picked.
 * - Every failure is reported as a plain sentence, never as a silent nothing.
 */
export function useQrScanner({ onResult, onError } = {}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const [active, setActive] = useState(false)
  const [error, setError] = useState(null)
  const lastValue = useRef('')

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    const stream = streamRef.current
    if (stream) stream.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  useEffect(() => stop, [stop])

  const handlePayload = useCallback((raw) => {
    if (!raw || raw === lastValue.current) return
    lastValue.current = raw
    const parsed = parseShopPayload(raw)
    if (!parsed.ok) {
      setError(parsed.reason)
      onError?.(parsed.reason)
      setTimeout(() => { lastValue.current = '' }, 1200)
      return
    }
    stop()
    onResult?.(parsed)
  }, [onResult, onError, stop])

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, w, h)
    const image = ctx.getImageData(0, 0, w, h)
    const found = jsQR(image.data, w, h, { inversionAttempts: 'dontInvert' })
    if (found?.data) handlePayload(found.data)
    else rafRef.current = requestAnimationFrame(tick)
  }, [handlePayload])

  const start = useCallback(async () => {
    setError(null)
    lastValue.current = ''
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = 'This browser cannot open the camera. Upload a QR image or type the shop code instead.'
      setError(msg); onError?.(msg); return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setActive(true)
      rafRef.current = requestAnimationFrame(tick)
      return true
    } catch (e) {
      const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError'
      const missing = e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError'
      const msg = denied
        ? 'Camera permission was blocked. Allow camera access for this site in your browser settings, or upload a QR image / type the shop code below.'
        : missing
          ? 'No camera was found on this device. Upload a QR image or type the shop code instead.'
          : `The camera could not start (${e?.name || 'unknown error'}). Upload a QR image or type the shop code.`
      setError(msg)
      onError?.(msg)
      return false
    }
  }, [onError, tick])

  /** Decode a QR from an uploaded image file. */
  const decodeFile = useCallback(async (file) => {
    setError(null)
    if (!file) return null
    if (!file.type.startsWith('image/')) {
      const msg = 'That file is not an image. Choose a screenshot or photo of the shop QR.'
      setError(msg); onError?.(msg); return null
    }
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('decode'))
        i.src = url
      })
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
      const canvas = canvasRef.current || document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const found = jsQR(data.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' })
      if (!found?.data) {
        const msg = 'No QR code was found in that image. Make sure the whole code is visible and not blurry.'
        setError(msg); onError?.(msg); return null
      }
      const parsed = parseShopPayload(found.data)
      if (!parsed.ok) {
        setError(parsed.reason); onError?.(parsed.reason); return null
      }
      onResult?.(parsed)
      return parsed
    } catch {
      const msg = 'That image could not be read. Try a clearer screenshot of the QR code.'
      setError(msg); onError?.(msg); return null
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [onResult, onError])

  return { videoRef, canvasRef, active, error, start, stop, decodeFile, clearError: () => setError(null) }
}
