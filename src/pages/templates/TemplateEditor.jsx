import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import Icon from '../../components/Icon.jsx'
import { request } from '../ceremony/api.js'
import { groupByPhase } from './templateItems.js'
import { diffItems } from '../../../shared/templateDiff.js'

let nextNew = 0
const newKey = () => `new-${Date.now().toString(36)}-${(nextNew += 1)}`

// An approved editor's view: they change their own copy, and "Send to the
// owner" saves it as a proposal. The template itself never changes here.
export default function TemplateEditor({ templateId, onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [ws, setWs] = useState(null)
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState({ kind: 'task', phase: '', label: '' })

  const load = () => request(`/api/ceremonies/templates/${templateId}/workspace`, accessToken)
    .then((data) => {
      setWs(data)
      setItems(data.myProposal?.items || data.items)
      setNote(data.myProposal?.note || '')
      setAdding((a) => ({ ...a, phase: a.phase || data.items[0]?.phase || 'GENERAL' }))
    })
    .catch((err) => setError(err.message))
  useEffect(() => { load() }, [templateId, accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const changeCount = useMemo(() => (ws ? diffItems(ws.items, items).length : 0), [ws, items])
  const phases = useMemo(() => [...new Set((ws?.items || []).concat(items).map((i) => i.phase))], [ws, items])
  const update = (key, patch) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  const remove = (key) => setItems((list) => list.filter((i) => i.key !== key))
  const add = () => {
    const label = adding.label.trim()
    if (!label) return
    const item = { key: newKey(), kind: adding.kind, phase: adding.phase || 'GENERAL', label, isOptional: false }
    if (adding.kind === 'cost') Object.assign(item, { quantity: 1, unit: 'item', unitCost: null })
    setItems((list) => [...list, item])
    setAdding((a) => ({ ...a, label: '' }))
  }

  const send = async () => {
    setSaving(true)
    try {
      const r = await request(`/api/ceremonies/templates/${templateId}/proposal`, accessToken, { method: 'PUT', body: JSON.stringify({ items, note }) })
      showToast(r.changeCount ? `${r.changeCount} change${r.changeCount === 1 ? '' : 's'} sent for approval` : 'Saved. No changes yet.', 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }
  const withdraw = async () => {
    await request(`/api/ceremonies/templates/${templateId}/proposal`, accessToken, { method: 'DELETE' }).catch(() => {})
    showToast('Your suggestion was withdrawn', 'info')
    load()
  }

  if (error) return <div className="min-h-screen bg-cream p-5"><button type="button" onClick={onBack} className="text-sm font-bold text-ink">← Back</button><p role="alert" className="mt-6 rounded-[16px] bg-white p-4 text-sm font-bold text-terracotta-dark shadow-soft">{error}</p></div>
  if (!ws) return <div className="min-h-screen bg-cream p-5 text-sm text-ink-muted">Loading…</div>

  return (
    <div className="min-h-screen bg-cream pb-48">
      <header className="bg-[#1f3320] px-5 pb-7 pt-6 text-cream">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold">← Templates</button>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ochre-light">Iziphakamiso · Your suggestions</p>
        <h1 className="mt-1 font-display text-[1.8rem] font-semibold leading-tight">{ws.template.title}</h1>
        <p className="mt-1 text-sm text-cream/80">Change your copy, then send it. The owner sees their original beside yours and chooses what to keep.</p>
      </header>

      <div className="space-y-4 px-4 pt-5">
        {ws.myProposal && (
          <div className="flex items-center justify-between gap-3 rounded-[18px] bg-[#efe6d8] p-3.5">
            <p className="text-[13px] font-bold text-ink">Waiting for approval: {ws.myProposal.changeCount} change{ws.myProposal.changeCount === 1 ? '' : 's'}</p>
            <button type="button" onClick={withdraw} className="text-xs font-extrabold text-terracotta-dark">Withdraw</button>
          </div>
        )}

        {groupByPhase(items).map((g) => (
          <section key={g.phase} aria-label={g.title}>
            <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-terracotta-dark">{g.title}</p>
            <ul className="mt-2 space-y-2">
              {g.items.map((i) => (
                <li key={i.key} className={`rounded-[16px] bg-white p-3 shadow-soft ${i.key.startsWith('new-') ? 'ring-2 ring-[#2e4a2e]/30' : ''}`}>
                  <div className="flex items-center gap-2">
                    <input value={i.label} maxLength={160} onChange={(e) => update(i.key, { label: e.target.value })} aria-label="Item name" className="h-10 min-w-0 flex-1 rounded-[10px] border border-ink/10 px-2.5 text-[14px] font-semibold text-ink" />
                    <button type="button" onClick={() => remove(i.key)} aria-label={`Remove ${i.label}`} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-terracotta/10"><Icon name="trash" size={15} color="#a3471a" /></button>
                  </div>
                  {i.kind === 'cost' && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <label className="text-[11px] font-bold text-ink-muted">How many<input type="number" min="0" inputMode="decimal" value={i.quantity ?? ''} onChange={(e) => update(i.key, { quantity: e.target.value === '' ? null : Number(e.target.value) })} className="mt-0.5 h-9 w-full rounded-[10px] border border-ink/10 px-2 text-sm text-ink" /></label>
                      <label className="text-[11px] font-bold text-ink-muted">Unit<input value={i.unit || ''} maxLength={60} onChange={(e) => update(i.key, { unit: e.target.value })} className="mt-0.5 h-9 w-full rounded-[10px] border border-ink/10 px-2 text-sm text-ink" /></label>
                      <label className="text-[11px] font-bold text-ink-muted">Price each (R)<input type="number" min="0" inputMode="decimal" value={i.unitCost ?? ''} onChange={(e) => update(i.key, { unitCost: e.target.value === '' ? null : Number(e.target.value) })} className="mt-0.5 h-9 w-full rounded-[10px] border border-ink/10 px-2 text-sm text-ink" /></label>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="space-y-2 rounded-[18px] bg-white p-3.5 shadow-soft">
          <p className="text-[13px] font-bold text-ink">Add something</p>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-cream-dark p-1">
            {[['task', 'To do'], ['cost', 'To buy']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setAdding((a) => ({ ...a, kind: k }))} className={`min-h-9 rounded-full text-xs font-extrabold ${adding.kind === k ? 'bg-[#1f3320] text-cream' : 'text-ink-muted'}`}>{l}</button>
            ))}
          </div>
          <select value={adding.phase} onChange={(e) => setAdding((a) => ({ ...a, phase: e.target.value }))} aria-label="Stage" className="h-10 w-full rounded-[10px] border border-ink/10 bg-white px-2 text-sm text-ink">
            {phases.map((ph) => <option key={ph} value={ph}>{groupByPhase([{ key: 'x', phase: ph }])[0].title}</option>)}
          </select>
          <div className="flex gap-2">
            <input value={adding.label} maxLength={160} onChange={(e) => setAdding((a) => ({ ...a, label: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') add() }} placeholder="e.g. Ipeki and shovel" className="h-10 min-w-0 flex-1 rounded-[10px] border border-ink/10 px-2.5 text-sm" />
            <button type="button" onClick={add} className="h-10 rounded-full bg-[#2e4a2e] px-4 text-sm font-bold text-cream">Add</button>
          </div>
        </section>

        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="A note for the owner: why these changes (optional)" className="w-full rounded-[14px] border border-ink/15 bg-white px-3 py-2 text-sm" />
      </div>

      <div className="fixed inset-x-0 bottom-24 z-30 mx-auto max-w-md px-4">
        <button type="button" onClick={send} disabled={saving} className="min-h-12 w-full rounded-full bg-terracotta text-[15px] font-extrabold text-white shadow-[0_14px_32px_-10px_rgba(196,92,38,0.9)] disabled:opacity-60">
          {saving ? 'Sending…' : changeCount ? `Send ${changeCount} change${changeCount === 1 ? '' : 's'} for approval` : 'No changes yet'}
        </button>
      </div>
    </div>
  )
}
