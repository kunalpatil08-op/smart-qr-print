import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Search, Trash2, Printer, Clock, HardDrive, ShieldCheck, Download, Filter } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, SegmentedControl } from '../../components/ui.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import { fmtDate, timeAgo } from '../../lib/db.js'

const fmtSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export default function Documents() {
  const data = useData()
  const toast = useToast()
  const docs = data.documents()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('recent')

  const list = useMemo(() => {
    let l = docs.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
    if (sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'pages') l = [...l].sort((a, b) => b.pages - a.pages)
    return l
  }, [docs, q, sort])

  const totalSize = docs.reduce((s, d) => s + (d.size || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">My Documents</h1>
          <p className="mt-1 text-[12.5px] text-ink-400">{docs.length} files · {fmtSize(totalSize)} stored</p>
        </div>
        <Button to="/app/print" size="md">Upload a PDF</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: FileText, label: 'Documents', value: docs.length },
          { icon: HardDrive, label: 'Storage used', value: fmtSize(totalSize) },
          { icon: Clock, label: 'Auto-deleted soon', value: docs.filter((d) => d.expiresAt && new Date(d.expiresAt) - Date.now() < 86400000).length },
          { icon: ShieldCheck, label: 'Retention policy', value: '24 hours' },
        ].map((s) => (
          <Card key={s.label} className="p-3.5">
            <s.icon size={14} className="text-electric-300" />
            <p className="mt-2 font-display text-lg font-bold leading-none text-white">{s.value}</p>
            <p className="mt-1 text-[10.5px] text-ink-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-white/8 px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="w-full rounded-lg border border-white/10 bg-navy-950/50 py-2 pl-9 pr-3 text-[12.5px] text-ink-100 outline-none focus:border-electric-400/50" />
          </div>
          <SegmentedControl options={[{ value: 'recent', label: 'Recent' }, { value: 'name', label: 'Name' }, { value: 'pages', label: 'Pages' }]} value={sort} onChange={setSort} />
        </div>

        {list.length === 0 ? (
          <EmptyState icon={FileText} title="No documents found" description={q ? 'Try a different search term.' : 'Upload your first PDF to get started.'} action={<Button to="/app/print" size="sm">Upload a PDF</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[12.5px]">
              <thead className="text-[10.5px] uppercase tracking-wide text-ink-500">
                <tr className="border-b border-white/6">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Pages</th>
                  <th className="px-3 py-2.5 font-medium">Size</th>
                  <th className="px-3 py-2.5 font-medium">Added</th>
                  <th className="px-3 py-2.5 font-medium">Retention</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {list.map((d) => {
                  const soon = d.expiresAt && new Date(d.expiresAt) - Date.now() < 86400000
                  return (
                    <tr key={d.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/20"><FileText size={13} /></span>
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate font-medium text-ink-100">{d.name}</p>
                            <p className="text-[10px] text-ink-500">via {d.source}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-300">{d.pages}</td>
                      <td className="px-3 py-3 text-ink-400">{fmtSize(d.size || 0)}</td>
                      <td className="px-3 py-3 text-ink-400">{timeAgo(d.createdAt)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={soon ? 'amber' : 'slate'}>{d.expiresAt ? fmtDate(d.expiresAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link to="/app/print" className="rounded-md p-1.5 text-ink-400 hover:bg-white/8 hover:text-electric-300" aria-label="Print document"><Printer size={13} /></Link>
                          <button onClick={() => toast('Download requires the storage backend; nothing was downloaded.', 'warning')} className="rounded-md p-1.5 text-ink-400 hover:bg-white/8 hover:text-electric-300" aria-label="Download"><Download size={13} /></button>
                          <button
                            onClick={() => { if (confirm(`Remove ${d.name} from your library?`)) { data.removeDocument(d.id); toast('Document removed.', 'info') } }}
                            className="rounded-md p-1.5 text-ink-400 hover:bg-rose-500/15 hover:text-rose-300" aria-label="Delete"
                          ><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-center text-[11px] text-ink-600">Files are automatically deleted when their retention window ends. Deleted files are purged from storage, not just hidden.</p>
    </div>
  )
}
