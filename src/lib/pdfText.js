/**
 * PDF text extraction in the browser.
 *
 * Reads the real text layer of a PDF so the AI works on the document's actual
 * content, not just its filename. Files never leave the browser — only the
 * extracted text is sent to the AI function.
 *
 * Limitations, stated plainly in the UI: a scanned PDF has no text layer, and
 * this reports that instead of pretending it read the pages.
 */

/** Inflate a zlib/deflate stream using the browser's DecompressionStream. */
async function inflate(bytes, format = 'deflate') {
  if (typeof DecompressionStream === 'undefined') return null
  try {
    const ds = new DecompressionStream(format)
    const stream = new Blob([bytes]).stream().pipeThrough(ds)
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

/** Pull readable strings out of a PDF content stream (Tj / TJ operators). */
function stringsFromContent(text) {
  const out = []
  const re = /\(((?:\\.|[^()\\])*)\)\s*(?:Tj|TJ|')|\[((?:[^\]]|\\.)*)\]\s*TJ/g
  let m
  while ((m = re.exec(text))) {
    if (m[1] !== undefined) {
      out.push(m[1].replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: '\n', r: '\r', t: '\t', b: '', f: '' }[c] ?? c)))
    } else if (m[2] !== undefined) {
      const parts = [...m[2].matchAll(/\(((?:\\.|[^()\\])*)\)/g)].map((x) => x[1].replace(/\\([()\\])/g, '$1'))
      out.push(parts.join(''))
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * @param {File} file
 * @param {{ maxPages?: number, maxChars?: number }} opts
 * @returns {Promise<{ text: string, pages: number, pagesRead: number, chars: number, hasText: boolean, note?: string }>}
 */
export async function extractPdfText(file, { maxPages = 40, maxChars = 60000 } = {}) {
  const buf = new Uint8Array(await file.arrayBuffer())
  const latin = new TextDecoder('latin1').decode(buf)

  // count pages (best effort)
  const pageMatches = [...latin.matchAll(/\/Type\s*\/Page[^s]/g)].length
  const countMatch = latin.match(/\/Count\s+(\d+)/)
  const pages = pageMatches || Number(countMatch?.[1]) || 1

  const chunks = []
  let pagesRead = 0

  // 1. Content streams: "stream … endstream" followed by endobj
  const streamRe = /stream\r?\n/g
  let sm
  let index = 0
  while ((sm = streamRe.exec(latin)) && pagesRead < maxPages) {
    const start = sm.index + sm[0].length
    const end = latin.indexOf('endstream', start)
    if (end === -1) break
    index += 1
    // Only try streams that look like page content
    const dictStart = Math.max(0, latin.lastIndexOf('<<', sm.index))
    const dict = latin.slice(dictStart, sm.index)
    if (!/\/Contents|FlateDecode|\/Length/.test(dict) || /\/Subtype\s*\/Image|\/Font|\/XObject/.test(dict)) continue
    const raw = buf.subarray(start, end)
    let text = ''
    if (/FlateDecode/.test(dict)) {
      const inflated = await inflate(raw)
      if (inflated) text = stringsFromContent(new TextDecoder('latin1').decode(inflated))
    }
    if (!text) text = stringsFromContent(new TextDecoder('latin1').decode(raw))
    if (text.length > 20) {
      chunks.push(text)
      pagesRead += 1
    }
    streamRe.lastIndex = end
    if (chunks.join(' ').length > maxChars) break
  }

  // 2. Fallback: uncompressed text operators anywhere in the file
  if (chunks.length === 0) {
    const loose = stringsFromContent(latin)
    if (loose.length > 80) {
      chunks.push(loose)
      pagesRead = pages
    }
  }

  const text = chunks.join('\n\n').slice(0, maxChars).trim()
  const hasText = text.length > 60

  return {
    text,
    pages,
    pagesRead: pagesRead || (hasText ? 1 : 0),
    chars: text.length,
    hasText,
    note: hasText
      ? undefined
      : 'No text layer was found in this PDF. It is most likely a scan or images only — AI notes need a text-based PDF, or paste the text manually.',
  }
}
