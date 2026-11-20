import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { request } from '../ceremony/api.js'
import { FIELD_NAMES, describeValue, groupByPhase } from './templateItems.js'
import { TEMPLATE_API } from './collabApi.js'

const TAG = {
  add: { text: 'Added', cls: 'bg-[#2e4a2e]/10 text-[#2e4a2e]' },
  remove: { text: 'Removed', cls: 'bg-terracotta/10 text-terracotta-dark' },
  change: { text: 'Changed', cls: 'bg-ochre/15 text-[#8a5a10]' },
}

function ItemList({ items }) {
  return groupByPhase(items).map((g) => (
    <div key={g.phase} className="mb-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6f655a]">{g.title}</p>
      <ul className="mt-1 space-y-0.5 text-[14px] text-ink">
        {g.items.map((i) => <li key={i.key}>· {i.label}{i.kind === 'cost' && i.quantity ? ` (${i.quantity} ${i.unit}${i.unitCost ? `, R${i.unitCost}` : ''})` : ''}</li>)}
      </ul>
    </div>
  ))
}

// The owner's review: their original stays as it is; the editor's version
// sits beside it; each change can be taken or left before merging.
export default function ProposalReview({ templateId, proposalId, onBack, onDone, api = TEMPLATE_API }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('changes')
  const [accept, setAccept] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const base = `${api.base(templateId)}/proposals/${proposalId}`

  useEffect(() => {
    request(base, accessToken).then((d) => { setData(d); setAccept(new Set(d.changes.map((c) => c.id))) }).catch((err) => showToast(err.message, 'error'))
  }, [base, accessToken, showToast])

  const toggle = (id) => setAccept((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const merge = async () => {
    setBusy(true)
    try {
      const r = await request(`${base}/merge`, accessToken, { method: 'POST', body: JSON.stringify({ accept: [...accept] }) })
      showToast(`${r.applied} change${r.applied === 1 ? '' : 's'} merged into your ${api.noun}${r.skipped.length ? `; ${r.skipped.length} no longer applied` : ''}`, 'success')
      onDone?.()
    } catch (err) { showToast(err.message, 'error') } finally { setBusy(false) }
  }
  const decline = async () => {
    setBusy(true)
    try {
      await request(`${base}/decline`, accessToken, { method: 'POST' })
      showToast(`Declined. Your ${api.noun} is unchanged.`, 'info')
      onDone?.()
    } catch (err) { showToast(err.message, 'error') } finally { setBusy(false) }
  }

  if (!data) return <div className="min-h-screen bg-cream p-5 text-sm text-ink-muted">Loading…</div>
  const open = data.status === 'OPEN'

  return (
    <div className="min-h-screen bg-cream pb-40">
      <header className="bg-[#1f3320] px-5 pb-7 pt-6 text-cream">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold">← Back</button>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-cream/60">Iinguqu · Suggested changes</p>
        <h1 className="mt-1 font-display text-[1.7rem] font-semibold leading-tight">From {data.authorName}</h1>
        {data.note && <p className="mt-2 rounded-[14px] bg-white/10 px-3 py-2 text-sm italic text-cream/90">&ldquo;{data.note}&rdquo;</p>}
        <p className="mt-2 text-sm text-cream/75">Your {api.noun} stays as it is until you merge.</p>
      </header>

      <div className="px-4 pt-4">
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-full bg-white p-1 shadow-soft">
          {[['changes', `Changes (${data.changes.length})`], ['original', 'Your original'], ['edited', 'Edited version']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 rounded-full text-xs font-extrabold ${tab === id ? 'bg-[#1f3320] text-cream' : 'text-ink-muted'}`}>{label}</button>
          ))}
        </div>

        {tab === 'changes' && (
          <ul className="mt-4 space-y-2">
            {data.changes.length === 0 && <li className="rounded-[16px] bg-white p-4 text-sm text-ink-muted shadow-soft">No differences from your template.</li>}
            {data.changes.map((c) => {
              const item = c.after || c.before
              return (
                <li key={c.id}>
                  <label className="flex items-start gap-3 rounded-[16px] bg-white p-3.5 shadow-soft">
                    {open && <input type="checkbox" checked={accept.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 h-5 w-5 accent-[#2e4a2e]" />}
                    <span className="min-w-0 flex-1">
                      <span className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${TAG[c.type].cls}`}>{TAG[c.type].text}</span>
                      <span className={`text-[14px] font-bold text-ink ${c.type === 'remove' ? 'line-through' : ''}`}>{item.label}</span>
                      {c.type === 'add' && item.kind === 'cost' && <span className="mt-1 block text-xs text-ink-muted">{item.quantity ?? '?'} {item.unit}{item.unitCost ? ` at R${item.unitCost}` : ''}</span>}
                      {c.type === 'change' && (
                        <span className="mt-1 block space-y-0.5 text-xs text-ink-muted">
                          {c.fields.map((f) => <span key={f} className="block">{FIELD_NAMES[f]}: <span className="line-through">{describeValue(f, c.before[f])}</span> → <strong className="text-ink">{describeValue(f, c.after[f])}</strong></span>)}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        {tab === 'original' && <div className="mt-4 rounded-[18px] bg-white p-4 shadow-soft"><ItemList items={data.original} /></div>}
        {tab === 'edited' && <div className="mt-4 rounded-[18px] bg-white p-4 shadow-soft"><ItemList items={data.edited} /></div>}
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto grid max-w-md grid-cols-[1fr_auto] gap-2 px-4">
          <button type="button" onClick={merge} disabled={busy || accept.size === 0} className="min-h-12 rounded-full bg-[#1f3320] text-[15px] font-extrabold text-cream disabled:opacity-50">Merge {accept.size} selected</button>
          <button type="button" onClick={decline} disabled={busy} className="min-h-12 rounded-full border-2 border-terracotta/30 bg-white px-4 text-sm font-extrabold text-terracotta-dark">Decline</button>
        </div>
      )}
    </div>
  )
}
