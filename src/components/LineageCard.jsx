import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { MAX_GENERATIONS, MAX_NAME, generationName } from '../../shared/lineage.js'

// Umnombo wakho: the member's own line of ancestors, father first. Private
// unless they choose to let clan matches see the ancestors they share.
export default function LineageCard({ accessToken, onSaved, showToast }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState([{ name: '', place: '' }])
  const [share, setShare] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/iziduko/lineage', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        const byGen = new Map((data.ancestors || []).map((a) => [a.generation, a]))
        const deepest = Math.max(0, ...byGen.keys())
        const filled = Array.from({ length: Math.max(1, deepest) }, (_, i) => ({ name: byGen.get(i + 1)?.name || '', place: byGen.get(i + 1)?.place || '' }))
        setRows(filled)
        setShare(!!data.shareForMatching)
        setSavedCount(byGen.size)
      })
      .catch(() => {})
  }, [accessToken])

  const update = (i, field, value) => setRows((list) => list.map((r, j) => (j === i ? { ...r, [field]: value } : r)))

  const save = async () => {
    setSaving(true)
    try {
      const ancestors = rows.map((r, i) => ({ generation: i + 1, name: r.name, place: r.place })).filter((a) => a.name.trim())
      const res = await fetch('/api/iziduko/lineage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ancestors, shareForMatching: share }),
      })
      if (!res.ok) throw new Error('Could not save your line')
      const data = await res.json()
      setSavedCount(data.ancestors.length)
      showToast?.('Your line is saved', 'success')
      onSaved?.()
    } catch (err) {
      showToast?.(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mb-4 overflow-hidden rounded-[22px] bg-[#1f3320] text-cream shadow-[0_18px_36px_-24px_rgba(31,51,32,0.9)]">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ochre-light/20">
          <Icon name="users" size={18} color="#e0a94e" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-cream/60">Umnombo wakho · Your line</span>
          <span className="mt-0.5 block text-[15px] font-bold leading-snug">
            {savedCount ? `${savedCount} generation${savedCount === 1 ? '' : 's'} recorded` : 'Name your fathers, back as far as you know'}
          </span>
        </span>
        <Icon name={open ? 'arrowUp' : 'arrowDown'} size={16} color="#e0a94e" />
      </button>

      {open && (
        <div className="space-y-3 border-t border-cream/10 p-4">
          <p className="text-[13px] leading-relaxed text-cream/80">
            Start with your father, then his father, and on. Clan members who name the same ancestor meet you there, even eight generations back.
          </p>
          <ol className="space-y-2">
            {rows.map((row, i) => (
              <li key={i} className="rounded-[16px] bg-white/[0.06] p-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-cream/60">{generationName(i + 1)}</p>
                <input
                  value={row.name}
                  maxLength={MAX_NAME}
                  onChange={(e) => update(i, 'name', e.target.value)}
                  placeholder="His name"
                  aria-label={`${generationName(i + 1)}: name`}
                  className="mt-1.5 h-11 w-full rounded-[12px] bg-white px-3 text-[15px] font-semibold text-ink"
                />
                <input
                  value={row.place}
                  maxLength={MAX_NAME}
                  onChange={(e) => update(i, 'place', e.target.value)}
                  placeholder="Where he lived (optional)"
                  aria-label={`${generationName(i + 1)}: place`}
                  className="mt-1.5 h-10 w-full rounded-[12px] bg-white/90 px-3 text-[14px] text-ink"
                />
              </li>
            ))}
          </ol>
          {rows.length < MAX_GENERATIONS && (
            <button type="button" onClick={() => setRows((list) => [...list, { name: '', place: '' }])} className="pressable flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-ochre-light/40 text-sm font-bold text-ochre-light">
              <Icon name="plus" size={15} color="#e0a94e" /> Add the next generation back
            </button>
          )}
          <label className="flex items-start gap-3 rounded-[16px] bg-white/[0.06] p-3">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-1 h-5 w-5 accent-[#e0a94e]" />
            <span className="text-[13px] leading-snug text-cream/90">
              <span className="block font-bold text-cream">Help my clan find me</span>
              Clan matches see only the ancestors we share, never my whole line.
            </span>
          </label>
          <button type="button" onClick={save} disabled={saving} className="pressable min-h-12 w-full rounded-full bg-cream text-[15px] font-extrabold text-[#1f3320] disabled:opacity-60">
            {saving ? 'Saving…' : 'Save my line'}
          </button>
        </div>
      )}
    </section>
  )
}
