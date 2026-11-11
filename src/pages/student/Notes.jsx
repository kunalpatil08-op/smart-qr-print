import { useMemo, useRef, useState } from 'react'
import {
  NotebookPen, UploadCloud, Type, ClipboardPaste, Sparkles, Save, Download,
  Printer, Trash2, FileText, Wand2, X, BookOpen, AlertTriangle, Plus, Edit3, Eye,
} from 'lucide-react'
import { Badge, Button, Card, Input, IntegrationNote, SegmentedControl, Textarea } from '../../components/ui.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { isAIConfigured, generateNotes } from '../../lib/ai.js'
import { extractPdfText } from '../../lib/pdfText.js'
import { Link } from 'react-router-dom'
import { timeAgo } from '../../lib/db.js'

const FORMATS = [
  { id: 'short', label: 'Short notes', desc: 'Condensed essentials' },
  { id: 'detailed', label: 'Detailed notes', desc: 'Full explanations' },
  { id: 'exam', label: 'Exam-oriented', desc: 'Scoring focus' },
  { id: 'definitions', label: 'Important definitions', desc: 'Term-by-term' },
  { id: 'keypoints', label: 'Key points', desc: 'Bullet summary' },
  { id: 'qa', label: 'Question & answer', desc: 'Practice format' },
  { id: 'quick-revision', label: 'Quick revision sheet', desc: 'Last-minute' },
]

const SUBJECTS = ['Mathematics', 'Programming', 'Data Structures', 'Operating Systems', 'DBMS', 'Electronics', 'Physics', 'General']

function NotePreview({ title, subject, style, body, bare }) {
  return (
    <div className={`print-area rounded-xl bg-white p-6 text-slate-900 ${bare ? '' : 'shadow-xl'}`} id={bare ? undefined : 'note-print'}>
      <div className="flex items-start justify-between border-b border-slate-200 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">SMART QR PRINT</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-slate-900">{title || 'Untitled notes'}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{subject} · {FORMATS.find((f) => f.id === style)?.label}</p>
        </div>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">Study notes</span>
      </div>
      <div className="prose-sm mt-4 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">
        {body || 'Your generated notes will appear here. You can edit this text before saving, downloading or printing.'}
      </div>
      <p className="mt-6 border-t border-slate-200 pt-2 text-[9.5px] text-slate-400">
        Study aid only — not guaranteed examination questions. Verify against your syllabus.
      </p>
    </div>
  )
}

export default function Notes() {
  const data = useData()
  const toast = useToast()
  const notes = data.notes()
  const [tab, setTab] = useState('create')
  const [mode, setMode] = useState('topic')
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('DBMS')
  const [material, setMaterial] = useState('')
  const [style, setStyle] = useState('short')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(null) // {status, pagesRead, pages, chars}
  const [pdfText, setPdfText] = useState('')
  const [pdfInfo, setPdfInfo] = useState(null)
  const [result, setResult] = useState(null)
  const [editing, setEditing] = useState(false)
  const [view, setView] = useState('preview')
  const [subjectFilter, setSubjectFilter] = useState('All')
  const fileRef = useRef(null)
  const printRef = useRef(null)

  const grouped = useMemo(() => {
    const list = subjectFilter === 'All' ? notes : notes.filter((n) => n.subject === subjectFilter)
    return list
  }, [notes, subjectFilter])

  const subjects = useMemo(() => ['All', ...new Set(notes.map((n) => n.subject).filter(Boolean))], [notes])

  const pickFile = async (f) => {
    setFile(f || null)
    setPdfText('')
    setPdfInfo(null)
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      toast('Please choose a PDF file.', 'warning')
      return
    }
    setReading({ status: 'reading', pagesRead: 0, pages: 1 })
    try {
      const r = await extractPdfText(f)
      setPdfText(r.text)
      setPdfInfo(r)
      if (r.hasText) toast(`Read ${r.chars.toLocaleString()} characters from ${f.name}.`, 'success')
      else toast(r.note, 'warning', { duration: 7000 })
    } catch (e) {
      setPdfInfo({ hasText: false, note: `Could not read this PDF: ${e.message}` })
      toast('Could not read this PDF in the browser.', 'error')
    } finally {
      setReading(null)
    }
  }

  const generate = async () => {
    if (mode === 'topic' && !topic.trim()) return toast('Enter a topic to generate notes.', 'warning')
    if (mode === 'paste' && !material.trim()) return toast('Paste some study material first.', 'warning')
    if (mode === 'pdf' && !file) return toast('Choose a PDF first.', 'warning')
    if (mode === 'pdf' && !pdfText.trim()) return toast(pdfInfo?.note || 'No readable text was found in that PDF. Paste the text instead.', 'warning', { duration: 6000 })
    setBusy(true)
    setResult(null)
    const base = {
      title: (mode === 'topic' ? topic : file?.name?.replace(/\.pdf$/i, '') || topic) || 'Untitled notes',
      subject,
      style,
    }
    try {
      const res = await generateNotes({
        topic: mode === 'topic' ? topic : undefined,
        material: mode === 'paste' ? material : mode === 'pdf' ? pdfText : '',
        subject,
        style,
        title: base.title,
      })
      if (res.configured) {
        setResult({ ...base, title: res.title || base.title, subject: res.subject || subject, body: res.body })
        setView('preview')
        toast('Notes generated. Review and edit before saving.', 'success')
      } else {
        setResult({ ...base, body: '', unconfigured: true })
        toast(res.message || 'AI provider not configured — no notes were generated.', 'warning', { duration: 6000 })
      }
    } catch (e) {
      toast(e.message, 'error', { duration: 7000 })
    } finally {
      setBusy(false)
    }
  }

  const save = () => {
    if (!result) return
    const rec = data.saveNote({ id: result.id, ...result })
    setResult(rec)
    toast('Notes saved to your library.', 'success')
  }

  const downloadPdf = () => {
    // Uses the browser print dialog with "Save as PDF" — a real, working export.
    toast('Choose “Save as PDF” as the destination in the print dialog.', 'info')
    setTimeout(() => window.print(), 300)
  }

  const printNotes = () => {
    toast('Opening your browser print dialog…', 'info')
    setTimeout(() => window.print(), 250)
  }

  const removeNote = (id) => {
    data.deleteNote(id)
    if (result?.id === id) setResult(null)
    toast('Note deleted.', 'info')
  }

  const openNote = (n) => {
    setResult(n)
    setEditing(false)
    setTab('create')
    setView('preview')
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">AI Notes Generator</h1>
          <p className="mt-1 text-[12.5px] text-ink-400">Turn a topic, a PDF or pasted material into structured, editable notes.</p>
        </div>
        <SegmentedControl options={[{ value: 'create', label: 'Workspace' }, { value: 'library', label: `Library (${notes.length})` }]} value={tab} onChange={setTab} />
      </div>

      {tab === 'library' ? (
        <div className="no-print space-y-4">
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button key={s} onClick={() => setSubjectFilter(s)} className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${subjectFilter === s ? 'border-electric-400/40 bg-electric-500/15 text-white' : 'border-white/10 text-ink-400 hover:border-white/25 hover:text-ink-100'}`}>{s}</button>
            ))}
          </div>
          {grouped.length === 0 ? (
            <Card><div className="py-14 text-center"><NotebookPen size={26} className="mx-auto text-ink-600" /><p className="mt-3 text-[13px] text-ink-400">No notes saved yet.</p><Button size="sm" className="mt-4" onClick={() => setTab('create')}><Plus size={14} /> Create notes</Button></div></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.map((n) => (
                <Card key={n.id} hover className="group p-4">
                  <div className="flex items-start justify-between">
                    <Badge tone="green">{n.subject}</Badge>
                    <button onClick={() => removeNote(n.id)} className="text-ink-600 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100" aria-label="Delete note"><Trash2 size={13} /></button>
                  </div>
                  <p className="mt-3 line-clamp-2 text-[13px] font-semibold text-white">{n.title}</p>
                  <p className="mt-1 text-[11px] text-ink-500">{FORMATS.find((f) => f.id === n.style)?.label} · {timeAgo(n.updatedAt)}</p>
                  <div className="mt-3 flex gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => openNote(n)}><Eye size={12} /> Open</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setResult(n); setTimeout(() => window.print(), 200) }}><Printer size={12} /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Card className="no-print p-5">
            <h2 className="text-[15px] font-semibold text-white">Source</h2>
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-navy-950/50 p-1">
              {[
                { id: 'topic', label: 'Topic', icon: Type },
                { id: 'pdf', label: 'PDF', icon: UploadCloud },
                { id: 'paste', label: 'Paste', icon: ClipboardPaste },
              ].map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-medium transition-colors ${mode === m.id ? 'bg-electric-500/20 text-white ring-1 ring-electric-400/40' : 'text-ink-400 hover:text-ink-100'}`}>
                  <m.icon size={13} /> {m.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {mode === 'topic' && (
                <Input label="Topic" placeholder="e.g. Normalization in DBMS" value={topic} onChange={(e) => setTopic(e.target.value)} />
              )}
              {mode === 'pdf' && (
                <div>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-white/12 bg-navy-950/40 py-8 text-center transition-colors hover:border-emerald-400/40"
                  >
                    {file ? (
                      <div className="flex items-center gap-2 px-4">
                        <FileText size={16} className="text-emerald-300" />
                        <span className="max-w-[200px] truncate text-[12.5px] text-ink-100">{file.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setFile(null) }} className="text-ink-500 hover:text-white" aria-label="Remove file"><X size={13} /></button>
                      </div>
                    ) : (
                      <div>
                        <UploadCloud size={22} className="mx-auto text-ink-500" />
                        <p className="mt-2 text-[12px] text-ink-400">Click to choose a PDF</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
                  {reading && (
                    <p className="mt-2 text-[11px] text-electric-300">
                      {reading.status === 'reading' ? `Reading text from the PDF… ${reading.pagesRead}/${reading.pages} pages` : reading.status}
                    </p>
                  )}
                  {pdfInfo && !reading && (
                    <p className={`mt-2 rounded-lg border px-2.5 py-1.5 text-[11px] leading-relaxed ${pdfInfo.hasText ? 'border-emerald-400/25 bg-emerald-400/5 text-emerald-200' : 'border-amber-400/25 bg-amber-400/5 text-amber-200'}`}>
                      {pdfInfo.hasText
                        ? `Extracted ${pdfInfo.chars.toLocaleString()} characters from ${pdfInfo.pagesRead} of ${pdfInfo.pages} pages.`
                        : pdfInfo.note}
                    </p>
                  )}
                </div>
              )}
              {mode === 'paste' && (
                <Textarea label="Study material" rows={6} placeholder="Paste your syllabus points, lecture notes or chapter text…" value={material} onChange={(e) => setMaterial(e.target.value)} />
              )}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink-300" htmlFor="subject">Subject</label>
                <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2.5 text-[13px] text-ink-100 outline-none focus:border-electric-400/60">
                  {SUBJECTS.map((s) => <option key={s} className="bg-navy-900">{s}</option>)}
                </select>
              </div>
            </div>

            <h3 className="mt-5 text-[13px] font-semibold text-white">Generation format</h3>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {FORMATS.map((f) => (
                <button key={f.id} onClick={() => setStyle(f.id)} className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${style === f.id ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}>
                  <p className={`text-[12px] font-medium ${style === f.id ? 'text-white' : 'text-ink-200'}`}>{f.label}</p>
                  <p className="text-[10px] text-ink-500">{f.desc}</p>
                </button>
              ))}
            </div>

            <Button className="mt-4 w-full" onClick={generate} loading={busy}>
              {busy ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Writing your notes…</> : <><Wand2 size={15} /> Generate notes</>}
            </Button>

            {!isAIConfigured && (
              <IntegrationNote className="mt-3">
                <b>AI provider not configured.</b> Generation is disabled on this deployment — no notes are fabricated. <Link to="/app/ai-settings" className="font-semibold underline decoration-dotted">Check the AI setup</Link>. You can still write notes manually in the editor.
              </IntegrationNote>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-ink-600">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" /> AI-generated notes are editable study aids. They are not guaranteed examination questions.
            </p>
          </Card>

          <Card className="p-5">
            <div className="no-print flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-white">{result ? 'Result' : 'Preview'}</h2>
              {result && (
                <div className="flex items-center gap-1.5">
                  <SegmentedControl options={[{ value: 'preview', label: 'Preview' }, { value: 'edit', label: 'Edit' }]} value={view} onChange={setView} />
                </div>
              )}
            </div>

            {result?.unconfigured && (
              <div className="no-print mt-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3 text-[12px] leading-relaxed text-amber-200">
                No AI response was produced because the provider is not connected. Nothing was generated. You can still write your notes below.
              </div>
            )}

            {view === 'edit' && result ? (
              <div className="no-print mt-3 space-y-3">
                <Input label="Title" value={result.title} onChange={(e) => setResult({ ...result, title: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <select value={result.subject} onChange={(e) => setResult({ ...result, subject: e.target.value })} className="rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2 text-[12.5px] text-ink-100 outline-none">
                    {SUBJECTS.map((s) => <option key={s} className="bg-navy-900">{s}</option>)}
                  </select>
                  <select value={result.style} onChange={(e) => setResult({ ...result, style: e.target.value })} className="rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2 text-[12.5px] text-ink-100 outline-none">
                    {FORMATS.map((f) => <option key={f.id} value={f.id} className="bg-navy-900">{f.label}</option>)}
                  </select>
                </div>
                <Textarea label="Notes content" rows={14} value={result.body} onChange={(e) => setResult({ ...result, body: e.target.value })} placeholder="Write or edit your notes here…" />
              </div>
            ) : (
              <div className="mt-3">
                <NotePreview title={result?.title} subject={result?.subject || subject} style={result?.style || style} body={result?.body} />
              </div>
            )}

            <div className="no-print mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={save} disabled={!result}><Save size={13} /> Save notes</Button>
              <Button size="sm" variant="secondary" onClick={downloadPdf} disabled={!result}><Download size={13} /> Download PDF</Button>
              <Button size="sm" variant="secondary" onClick={printNotes} disabled={!result}><Printer size={13} /> Print notes</Button>
              {result && <Button size="sm" variant="ghost" onClick={() => setResult(null)}><X size={13} /> Clear</Button>}
            </div>
            <p className="no-print mt-2 text-[10.5px] text-ink-600">Download and print use the browser’s own PDF/print engine, so the exported file matches the preview.</p>
          </Card>
        </div>
      )}

      {/* print target: only this is visible when the browser prints */}
      <div className="hidden print:block">
        <NotePreview bare title={result?.title} subject={result?.subject || subject} style={result?.style || style} body={result?.body} />
      </div>
    </div>
  )
}
