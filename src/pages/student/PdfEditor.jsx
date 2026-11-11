import { useMemo, useRef, useState } from 'react'
import {
  UploadCloud, RotateCw, RotateCcw, Trash2, ArrowLeft, ArrowRight, Layers, Scissors,
  FileText, Download, Sparkles, Check, X, FileDown, Copy, Eye, GripVertical, Info,
} from 'lucide-react'
import { Badge, Button, Card, IntegrationNote, SegmentedControl, Textarea } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { isAIConfigured, requestCompletion } from '../../lib/ai.js'
import { Link } from 'react-router-dom'

const makePage = (n) => ({ uid: `p_${n}_${Math.random().toString(36).slice(2, 7)}`, source: n, rotation: 0, deleted: false })

function PageThumb({ page, index, onRotate, onDelete, onMove, selected, onSelect, total }) {
  return (
    <div className={`group relative rounded-lg border transition-all ${page.deleted ? 'border-rose-400/30 bg-rose-400/5 opacity-50' : selected ? 'border-electric-400/50 bg-electric-500/10' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="relative aspect-[1/1.414] overflow-hidden rounded-t-lg bg-white/[0.04]">
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center" style={{ transform: `rotate(${page.rotation}deg)` }}>
            <FileText size={22} className="mx-auto text-ink-600" />
            <p className="mt-1 text-[10px] text-ink-500">Page {page.source}</p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-navy-950/90 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onRotate(page.uid, 90)} className="rounded bg-white/10 p-1 text-ink-200 hover:bg-white/20" aria-label="Rotate clockwise"><RotateCw size={11} /></button>
          <button onClick={() => onRotate(page.uid, -90)} className="rounded bg-white/10 p-1 text-ink-200 hover:bg-white/20" aria-label="Rotate anticlockwise"><RotateCcw size={11} /></button>
          <button onClick={() => onDelete(page.uid)} className="rounded bg-rose-500/25 p-1 text-rose-200 hover:bg-rose-500/40" aria-label="Delete page">{page.deleted ? <X size={11} /> : <Trash2 size={11} />}</button>
        </div>
        <input type="checkbox" checked={selected} onChange={() => onSelect(page.uid)} className="absolute left-1.5 top-1.5 h-3.5 w-3.5 accent-electric-500" aria-label={`Select page ${page.source}`} />
        {page.rotation !== 0 && <span className="absolute right-1.5 top-1.5 rounded bg-navy-950/80 px-1 text-[9px] text-ink-300">{page.rotation}°</span>}
      </div>
      <div className="flex items-center justify-between px-1.5 py-1">
        <span className="text-[10px] text-ink-500">#{index + 1}</span>
        <div className="flex gap-0.5">
          <button onClick={() => onMove(page.uid, -1)} disabled={index === 0} className="text-ink-500 hover:text-white disabled:opacity-25" aria-label="Move left"><ArrowLeft size={10} /></button>
          <button onClick={() => onMove(page.uid, 1)} disabled={index === total - 1} className="text-ink-500 hover:text-white disabled:opacity-25" aria-label="Move right"><ArrowRight size={10} /></button>
        </div>
      </div>
    </div>
  )
}

export default function PdfEditor() {
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [pages, setPages] = useState([])
  const [selected, setSelected] = useState([])
  const [tab, setTab] = useState('organise')
  const [text, setText] = useState('')
  const [aiOut, setAiOut] = useState(null)
  const [busy, setBusy] = useState(false)
  const [mergeFiles, setMergeFiles] = useState([])
  const [splitRange, setSplitRange] = useState('')
  const fileRef = useRef(null)
  const mergeRef = useRef(null)

  const activePages = useMemo(() => pages.filter((p) => !p.deleted), [pages])
  const pageCount = pages.length

  const onFile = async (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) return toast('Only PDF files are supported in the editor.', 'warning')
    if (url) URL.revokeObjectURL(url)
    const u = URL.createObjectURL(f)
    setFile(f); setUrl(u); setSelected([]); setText(''); setAiOut(null)
    let count = 1
    try {
      const buf = await f.slice(0, 4_000_000).arrayBuffer()
      const t = new TextDecoder('latin1').decode(buf)
      const m = [...t.matchAll(/\/Type\s*\/Page[^s]/g)]
      count = m.length || Number((t.match(/\/Count\s+(\d+)/) || [])[1]) || 1
    } catch { count = 1 }
    count = Math.min(Math.max(count, 1), 60)
    setPages(Array.from({ length: count }, (_, i) => makePage(i + 1)))
    toast(`Loaded ${f.name} — ${count} page${count > 1 ? 's' : ''} detected.`, 'success')
  }

  const rotate = (uid, deg) => setPages((ps) => ps.map((p) => (p.uid === uid ? { ...p, rotation: (((p.rotation + deg) % 360) + 360) % 360 } : p)))
  const toggleDelete = (uid) => setPages((ps) => ps.map((p) => (p.uid === uid ? { ...p, deleted: !p.deleted } : p)))
  const move = (uid, dir) => setPages((ps) => {
    const i = ps.findIndex((p) => p.uid === uid)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ps.length) return ps
    const next = [...ps]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })
  const toggleSelect = (uid) => setSelected((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]))
  const rotateSelected = () => {
    if (!selected.length) return toast('Select pages first.', 'warning')
    setPages((ps) => ps.map((p) => (selected.includes(p.uid) ? { ...p, rotation: (p.rotation + 90) % 360 } : p)))
    toast(`Rotated ${selected.length} page(s).`, 'success')
  }
  const deleteSelected = () => {
    if (!selected.length) return toast('Select pages first.', 'warning')
    setPages((ps) => ps.map((p) => (selected.includes(p.uid) ? { ...p, deleted: true } : p)))
    setSelected([])
    toast('Selected pages marked for removal. Export the copy to apply.', 'info')
  }

  const onMergeFiles = (list) => {
    const arr = Array.from(list || []).filter((f) => f.name.toLowerCase().endsWith('.pdf'))
    if (!arr.length) return
    setMergeFiles(arr)
    toast(`${arr.length} file(s) queued for merge.`, 'info')
  }

  const doMerge = () => {
    if (mergeFiles.length < 2) return toast('Select at least two PDFs to merge.', 'warning')
    toast('Merge requires server-side PDF processing — configure the backend function to produce the merged file.', 'warning', { duration: 6000 })
  }

  const extractText = async () => {
    if (!file) return toast('Open a PDF first.', 'warning')
    try {
      const buf = await file.arrayBuffer()
      const raw = new TextDecoder('latin1').decode(buf)
      const chunks = [...raw.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g)].map((m) => m[1].replace(/\\([()\\])/g, '$1'))
      const tj = chunks.join(' ').trim()
      if (tj) {
        setText(tj.slice(0, 20000))
        toast('Text layer extracted from the PDF.', 'success')
      } else {
        setText('')
        toast('No selectable text layer found — this PDF is likely a scan and needs OCR.', 'warning', { duration: 6000 })
      }
    } catch {
      toast('Could not read this PDF in the browser.', 'error')
    }
  }

  const aiAction = async (kind) => {
    if (!text.trim()) return toast('Extract or paste some text first.', 'warning')
    setBusy(true)
    setAiOut(null)
    const prompts = {
      proofread: 'Proofread this document text. Return corrected text followed by a short list of changes.',
      grammar: 'Correct the grammar and spelling in this text. Return the corrected text.',
      format: 'Suggest formatting and structure improvements for this document, with a short bulleted plan.',
      summary: 'Summarise this document in a short overview plus key points.',
    }
    try {
      const res = await requestCompletion({
        system: 'You are a careful academic document editor.',
        messages: [{ role: 'user', content: `${prompts[kind]}\n\n---\n${text.slice(0, 8000)}` }],
        task: 'proofread',
      })
      if (res.configured) setAiOut({ kind, content: res.content })
      else {
        setAiOut({ kind, unavailable: true })
        toast('AI provider not configured — no result was produced.', 'warning')
      }
    } catch (e) {
      toast(e.message, 'error', { duration: 8000 })
    } finally {
      setBusy(false)
    }
  }

  const exportCopy = () => {
    toast('Exporting a modified copy requires server-side PDF generation — this placeholder does not write a file.', 'warning', { duration: 6500 })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">PDF &amp; Document Editor</h1>
          <p className="mt-1 text-[12.5px] text-ink-400">Organise pages, extract text and get AI help — then export a copy.</p>
        </div>
        {file && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setFile(null); setUrl(''); setPages([]); setText(''); setAiOut(null) }}>Close file</Button>
            <Button size="sm" onClick={exportCopy}><FileDown size={14} /> Export copy</Button>
          </div>
        )}
      </div>

      {!file ? (
        <Card className="p-6">
          <div
            onClick={() => fileRef.current?.click()}
            className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-white/12 bg-navy-950/40 py-16 text-center transition-colors hover:border-amber-400/40 hover:bg-white/[0.02]"
          >
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25"><UploadCloud size={24} /></span>
              <p className="mt-4 text-[14px] font-semibold text-white">Open a PDF to begin</p>
              <p className="mt-1 text-[12px] text-ink-500">Your file stays in the browser — nothing is uploaded.</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              [Layers, 'Merge & split', 'Combine files or export page ranges'],
              [FileText, 'Text extraction', 'Pull the text layer out of a PDF'],
              [Sparkles, 'AI proofreading', 'Grammar, formatting and summaries'],
            ].map(([Icon, t, d]) => (
              <div key={t} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <Icon size={15} className="text-amber-300" />
                <p className="mt-2 text-[12px] font-medium text-ink-100">{t}</p>
                <p className="text-[10.5px] text-ink-500">{d}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          {/* left: viewer + pages */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
                <p className="truncate text-[12.5px] font-medium text-ink-100">{file.name}</p>
                <span className="shrink-0 text-[11px] text-ink-500">{activePages.length}/{pageCount} pages</span>
              </div>
              <object data={`${url}#toolbar=0&view=FitH`} type="application/pdf" className="h-[380px] w-full bg-white/95" aria-label={`Preview of ${file.name}`}>
                <div className="p-6 text-center text-[12px] text-ink-500">This browser cannot embed PDFs. <a className="text-electric-300 underline" href={url} target="_blank" rel="noreferrer">Open in a new tab</a>.</div>
              </object>
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-white">Pages</h3>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={rotateSelected}><RotateCw size={12} /> Rotate</Button>
                  <Button size="sm" variant="ghost" onClick={deleteSelected}><Trash2 size={12} /> Delete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(activePages.map((p) => p.uid))}>Select all</Button>
                </div>
              </div>
              <div className="grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                {pages.map((p, i) => (
                  <PageThumb key={p.uid} page={p} index={i} total={pages.length} onRotate={rotate} onDelete={toggleDelete} onMove={move} selected={selected.includes(p.uid)} onSelect={toggleSelect} />
                ))}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[10.5px] text-ink-600"><Info size={10} className="mt-0.5 shrink-0" /> Page operations are recorded against a working copy. The original file is never modified.</p>
            </Card>
          </div>

          {/* right: tools */}
          <Card className="p-4">
            <SegmentedControl
              className="mb-4"
              options={[{ value: 'organise', label: 'Organise' }, { value: 'merge', label: 'Merge / split' }, { value: 'text', label: 'Text & AI' }]}
              value={tab}
              onChange={setTab}
            />

            {tab === 'organise' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/8 bg-navy-950/40 p-3">
                  <p className="text-[12px] font-medium text-ink-100">Working copy</p>
                  <div className="mt-2 space-y-1.5 text-[11.5px]">
                    <div className="flex justify-between"><span className="text-ink-400">Original pages</span><span className="text-ink-100">{pageCount}</span></div>
                    <div className="flex justify-between"><span className="text-ink-400">Kept</span><span className="text-emerald-300">{activePages.length}</span></div>
                    <div className="flex justify-between"><span className="text-ink-400">Removed</span><span className="text-rose-300">{pageCount - activePages.length}</span></div>
                    <div className="flex justify-between"><span className="text-ink-400">Rotated</span><span className="text-amber-300">{pages.filter((p) => p.rotation !== 0).length}</span></div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/8 bg-navy-950/40 p-3">
                  <p className="text-[12px] font-medium text-ink-100">Compression</p>
                  <p className="mt-1 text-[11px] text-ink-500">Reduce file size before printing. Requires server-side processing.</p>
                  <div className="mt-2 flex gap-1.5">
                    {['Low', 'Medium', 'High'].map((l) => (
                      <button key={l} onClick={() => toast(`Compression (${l}) is a server-side placeholder in this build.`, 'warning')} className="flex-1 rounded-lg border border-white/10 py-1.5 text-[11px] text-ink-300 hover:border-amber-400/40 hover:text-white">{l}</button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/8 bg-navy-950/40 p-3">
                  <p className="text-[12px] font-medium text-ink-100">Conversion</p>
                  <p className="mt-1 text-[11px] text-ink-500">PDF → DOCX / TXT is not available without a conversion service. Nothing is converted silently.</p>
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => toast('Conversion service not configured.', 'warning')}>Convert document</Button>
                </div>
                <Button className="w-full" onClick={exportCopy}><Download size={14} /> Export modified copy</Button>
                <p className="text-center text-[10.5px] text-ink-600">The original file remains untouched.</p>
              </div>
            )}

            {tab === 'merge' && (
              <div className="space-y-3">
                <div onClick={() => mergeRef.current?.click()} className="cursor-pointer rounded-xl border-2 border-dashed border-white/12 bg-navy-950/40 p-5 text-center hover:border-electric-400/40">
                  <Layers size={20} className="mx-auto text-ink-500" />
                  <p className="mt-2 text-[12px] text-ink-300">Choose two or more PDFs to merge</p>
                </div>
                <input ref={mergeRef} type="file" accept=".pdf" multiple className="hidden" onChange={(e) => onMergeFiles(e.target.files)} />
                {mergeFiles.length > 0 && (
                  <ul className="space-y-1.5">
                    {mergeFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
                        <GripVertical size={11} className="text-ink-600" />
                        <span className="flex-1 truncate text-[11.5px] text-ink-200">{f.name}</span>
                        <span className="text-[10px] text-ink-500">{(f.size / 1024).toFixed(0)} KB</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button className="w-full" size="sm" onClick={doMerge}><Layers size={13} /> Merge PDFs</Button>
                <div className="border-t border-white/8 pt-3">
                  <p className="text-[12px] font-medium text-ink-100">Split</p>
                  <div className="mt-2 flex gap-2">
                    <input value={splitRange} onChange={(e) => setSplitRange(e.target.value)} placeholder="e.g. 1-5, 6-10" className="flex-1 rounded-lg border border-white/10 bg-navy-950/60 px-2.5 py-1.5 text-[12px] text-ink-100 outline-none focus:border-electric-400/60" />
                    <Button size="sm" variant="secondary" onClick={() => toast('Split requires server-side PDF processing — not performed in this build.', 'warning')}><Scissors size={12} /> Split</Button>
                  </div>
                </div>
                <IntegrationNote>Merge and split need a backend PDF service (e.g. pdf-lib in an Edge Function). The interface is complete; the operation is not simulated.</IntegrationNote>
              </div>
            )}

            {tab === 'text' && (
              <div className="space-y-3">
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={extractText}><FileText size={12} /> Extract text</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(text).then(() => toast('Text copied.', 'success')).catch(() => toast('Clipboard unavailable.', 'warning')) }}><Copy size={12} /> Copy</Button>
                </div>
                <Textarea rows={9} placeholder="Extracted text appears here. You can also paste text to proofread." value={text} onChange={(e) => setText(e.target.value)} />
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ['proofread', 'Proofread'], ['grammar', 'Fix grammar'], ['format', 'Formatting ideas'], ['summary', 'Summarise'],
                  ].map(([k, l]) => (
                    <Button key={k} size="sm" variant="secondary" disabled={busy} onClick={() => aiAction(k)}>
                      <Sparkles size={12} /> {l}
                    </Button>
                  ))}
                </div>
                {!isAIConfigured && <IntegrationNote>AI features are disabled — no provider is configured. Nothing is generated locally. <Link to="/app/ai-settings" className="font-semibold underline decoration-dotted">Connect a provider</Link>.</IntegrationNote>}
                {busy && (
                  <div className="space-y-2 rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <div className="shimmer h-2.5 w-3/4 rounded" />
                    <div className="shimmer h-2.5 w-full rounded" />
                    <div className="shimmer h-2.5 w-2/3 rounded" />
                    <p className="pt-1 text-[10.5px] text-ink-500">Working on your document…</p>
                  </div>
                )}
                {aiOut && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <Badge tone={aiOut.unavailable ? 'amber' : 'violet'}>{aiOut.unavailable ? 'Unavailable' : 'AI result'}</Badge>
                      {!aiOut.unavailable && (
                        <button onClick={() => { setText(aiOut.content); toast('Applied to the working text.', 'success') }} className="inline-flex items-center gap-1 text-[11px] text-electric-300 hover:text-electric-200"><Check size={11} /> Apply</button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink-300">
                      {aiOut.unavailable ? 'The AI provider is not connected, so no proofreading result was produced.' : aiOut.content}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
