import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import Icon from '../components/Icon.jsx'

// Imisebenzi yezinyanya: a shared family list of rites still owed to the
// ancestors. Ordered oldest generation first because rites are hierarchical.

const GENERATIONS = [
  { value: 1, label: 'Parents' },
  { value: 2, label: 'Grandparents' },
  { value: 3, label: 'Great-grandparents' },
  { value: 4, label: 'Great-great-grandparents' },
  { value: 5, label: '5 generations back' },
  { value: 6, label: '6 generations back' },
]
const genLabel = (g) => GENERATIONS.find((x) => x.value === g)?.label || `${g} generations back`

const RITES = {
  UKUKHAPHA: { label: 'Ukukhapha', hint: 'Accompanying the departed' },
  UKUBUYISA: { label: 'Ukubuyisa', hint: 'Bringing the ancestor home' },
  INKOBE_ZIKA_MAMA: { label: 'Inkobe zika Mama', hint: 'For female ancestors' },
  OTHER: { label: 'Other rite', hint: 'Describe it in the notes' },
}

const STATUS = {
  OUTSTANDING: { label: 'Not done yet', cls: 'bg-terracotta/10 text-terracotta' },
  PLANNED: { label: 'Planned', cls: 'bg-brand-ochre/15 text-ink' },
  DONE: { label: 'Done', cls: 'bg-sage-100 text-sage-700' },
}

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'
const inp = 'w-full border-2 border-terracotta/20 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-terracotta/60'
const primaryBtn = `w-full bg-terracotta text-white font-bold py-3.5 rounded-pill shadow-terracotta ${pressable}`

// A "road sign": short guidance shown where people tend to get lost.
function Signpost({ icon = 'info', title, children }) {
  return (
    <div className="flex gap-3 rounded-soft border-2 border-brand-ochre/40 bg-brand-ochre/10 px-4 py-3">
      <Icon name={icon} size={18} color="#c45c26" className="mt-0.5 flex-shrink-0" />
      <div className="text-xs leading-relaxed text-ink">
        <p className="font-bold">{title}</p>
        <div className="text-ink-muted mt-0.5">{children}</div>
      </div>
    </div>
  )
}

export default function AncestralRites({ onBack, onOpenUbuhlanti, onOpenProfile }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ ancestorName: '', generation: 2, gender: 'MALE', rite: 'UKUBUYISA', notes: '' })

  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(`/api/iziduko${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Something went wrong')
    return body
  }, [accessToken])

  const load = useCallback(() => {
    api('/rites').then(setData).catch((e) => { showToast(e.message, 'error'); setData({ family: null, rites: [] }) })
  }, [api, showToast])

  useEffect(() => { if (accessToken) load() }, [accessToken, load])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api('/rites', { method: 'POST', body: JSON.stringify(form) })
      showToast('Added to the family list', 'success')
      setForm({ ancestorName: '', generation: form.generation, gender: 'MALE', rite: 'UKUBUYISA', notes: '' })
      setAdding(false)
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id, status) => {
    try { await api(`/rites/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load() }
    catch (err) { showToast(err.message, 'error') }
  }

  const remove = async (id) => {
    try { await api(`/rites/${id}`, { method: 'DELETE' }); setConfirmDelete(null); load() }
    catch (err) { showToast(err.message, 'error') }
  }

  const rites = data?.rites || []
  const groups = [...new Set(rites.map((r) => r.generation))].sort((a, b) => b - a)
  const done = rites.filter((r) => r.status === 'DONE').length

  return (
    <div className="min-h-screen bg-cream px-4 pt-6 pb-28 max-w-md mx-auto">
      <button type="button" onClick={onBack} className={`flex items-center gap-1.5 text-sm font-bold text-ink-muted mb-4 ${pressable}`}>
        <Icon name="arrowLeft" size={16} /> Back to More
      </button>

      <div className="wash-ember rings rounded-soft px-5 py-5 mb-4">
        <p className="eyebrow text-white/70">Imisebenzi yezinyanya</p>
        <h1 className="font-display font-bold text-2xl text-white leading-tight mt-1">Ancestral rites still to be done</h1>
        <p className="text-white/80 text-xs mt-1.5 leading-relaxed">
          One shared list for your family. Write down every ukukhapha, ukubuyisa and inkobe zika Mama still owed, before the knowledge is lost.
        </p>
        {data?.family && (
          <p className="mt-3 text-xs font-bold text-white">
            {data.family.clan} · {data.family.surname} family · {done} of {rites.length} done
          </p>
        )}
      </div>

      {data === null && <div className="h-32 rounded-soft bg-white/60 animate-pulse" />}

      {data && !data.family && (
        <div className="card-paper p-5 text-center space-y-3">
          <Icon name="users" size={32} color="#c45c26" className="mx-auto" />
          <p className="font-bold text-ink">Add your clan name first</p>
          <p className="text-xs text-ink-muted">Your family list is shared with relatives who have the same clan name (isiduko) and surname. Add your isiduko to your profile to open it.</p>
          <button type="button" onClick={onOpenProfile} className={primaryBtn}>Go to my profile</button>
        </div>
      )}

      {data?.family && (
        <div className="space-y-4">
          <Signpost icon="arrowUp" title="Start at the top, the oldest generation">
            You cannot do your parents' rite before their parents' rite is done. The list is sorted so the first rite to do is always at the top. Rites marked "Waiting" become ready once the older ones are done.
          </Signpost>

          {!adding ? (
            <button type="button" onClick={() => setAdding(true)} className={primaryBtn}>+ Add an ancestor's rite</button>
          ) : (
            <form onSubmit={submit} className="card-paper p-4 space-y-3">
              <p className="font-bold text-ink">Add an ancestor's rite</p>
              <input className={inp} placeholder="Ancestor's name, e.g. Tat'uNtsikana Mbeki" value={form.ancestorName}
                onChange={(e) => setForm({ ...form, ancestorName: e.target.value })} required />
              <label className="block text-xs font-bold text-ink-muted">How are they related to you?
                <select className={`${inp} mt-1`} value={form.generation} onChange={(e) => setForm({ ...form, generation: Number(e.target.value) })}>
                  {GENERATIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[['MALE', 'Male'], ['FEMALE', 'Female']].map(([v, l]) => (
                  <button key={v} type="button"
                    onClick={() => setForm({ ...form, gender: v, rite: v === 'MALE' && form.rite === 'INKOBE_ZIKA_MAMA' ? 'UKUBUYISA' : form.rite })}
                    className={`py-2.5 rounded-pill text-sm font-bold border-2 ${pressable} ${form.gender === v ? 'bg-terracotta text-white border-terracotta' : 'bg-white text-ink border-terracotta/20'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {Object.entries(RITES).filter(([k]) => k !== 'INKOBE_ZIKA_MAMA' || form.gender === 'FEMALE').map(([k, r]) => (
                  <button key={k} type="button" onClick={() => setForm({ ...form, rite: k })}
                    className={`w-full text-left px-4 py-2.5 rounded-2xl border-2 ${pressable} ${form.rite === k ? 'border-terracotta bg-terracotta/5' : 'border-terracotta/15 bg-white'}`}>
                    <span className="font-bold text-sm text-ink">{r.label}</span>
                    <span className="block text-[11px] text-ink-muted">{r.hint}</span>
                  </button>
                ))}
              </div>
              <textarea className={inp} rows={2} placeholder="Notes: who knows the details, which homestead, elders to ask"
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <button type="submit" disabled={saving} className={primaryBtn}>{saving ? 'Saving...' : 'Add to family list'}</button>
              <button type="button" onClick={() => setAdding(false)} className="w-full text-xs text-ink-muted underline">Cancel</button>
            </form>
          )}

          {rites.length === 0 && !adding && (
            <div className="card-paper p-6 text-center">
              <Icon name="footprints" size={32} color="#c45c26" className="mx-auto mb-2" />
              <p className="font-bold text-ink">Your family list is empty</p>
              <p className="text-xs text-ink-muted mt-1">Ask your elders which rites are still owed, and add the oldest ancestor first.</p>
            </div>
          )}

          {groups.map((g) => (
            <div key={g}>
              <p className="eyebrow mb-2 px-1">{genLabel(g)}</p>
              <div className="space-y-2">
                {rites.filter((r) => r.generation === g).map((r) => (
                  <div key={r.id} className={`card-paper p-4 ${r.waiting ? 'opacity-70' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-ink truncate">{r.ancestorName}</p>
                        <p className="text-xs text-ink-muted">{RITES[r.rite]?.label} · {r.gender === 'FEMALE' ? 'Female' : 'Male'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-pill flex-shrink-0 ${r.waiting ? 'bg-ink/10 text-ink-muted' : STATUS[r.status].cls}`}>
                        {r.waiting ? 'Waiting' : STATUS[r.status].label}
                      </span>
                    </div>
                    {r.waiting && <p className="text-[11px] text-ink-muted mt-2">Do the older generation's rites first.</p>}
                    {r.notes && <p className="text-xs text-ink mt-2 leading-relaxed">{r.notes}</p>}
                    <p className="text-[10px] text-ink-muted mt-2">Added by {r.addedBy}{r.updatedBy ? ` · updated by ${r.updatedBy}` : ''}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {Object.entries(STATUS).filter(([k]) => k !== r.status).map(([k, s]) => (
                        <button key={k} type="button" onClick={() => setStatus(r.id, k)}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-pill border-2 border-terracotta/20 bg-white text-ink ${pressable}`}>
                          Mark {s.label.toLowerCase()}
                        </button>
                      ))}
                      {r.mine && (confirmDelete === r.id ? (
                        <button type="button" onClick={() => remove(r.id)} className={`text-[11px] font-bold px-3 py-1.5 rounded-pill bg-terracotta text-white ${pressable}`}>Yes, remove</button>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(r.id)} className={`text-[11px] font-bold px-3 py-1.5 rounded-pill text-ink-muted ${pressable}`}>Remove</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button type="button" onClick={onOpenUbuhlanti}
            className={`w-full text-left rounded-soft p-4 ${pressable}`}
            style={{ background: 'linear-gradient(135deg, #c45c26 0%, #8c3b1a 100%)' }}>
            <div className="flex items-center gap-2">
              <Icon name="flame" size={18} color="#ffffff" />
              <p className="font-bold text-white text-sm">No kraal or homestead?</p>
            </div>
            <p className="text-white/80 text-xs mt-1 leading-relaxed">
              Ubuhlanti bakwaXhosa is a sacred, blessed sanctuary where families can perform these rites, with community support through tithes.
            </p>
            <p className="text-xs font-bold text-white mt-2">See Ubuhlanti →</p>
          </button>
        </div>
      )}
    </div>
  )
}
