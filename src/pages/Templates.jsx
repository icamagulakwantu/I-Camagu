import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import CeremonyIcon from '../components/CeremonyIcon.jsx'

const typeLabel = (type) => (type || '').replace(/_/g, ' ')

// Older templates have no counts from the server; treat every row as a checklist item.
const countsOf = (t) => ({
  tasks: t.taskCount ?? t.checklistItems?.length ?? 0,
  shopping: t.shoppingCount ?? 0,
})

function CountPill({ value, label, tone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {value} {label}
    </span>
  )
}

function Templates({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchTemplates = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    fetch('/api/ceremonies/templates/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Could not load templates'))))
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => { setLoadError(true); setTemplates([]) })
      .finally(() => setLoading(false))
  }, [accessToken])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const openTemplate = (t) => {
    setActiveTemplate(t)
    setNewTitle(t.title.replace(/\s*Template$/i, ''))
    setEventDate('')
  }

  const createFromTemplate = async (e) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) { showToast('Please give your ceremony a name', 'error'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/ceremonies/templates/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ templateId: activeTemplate.id, newTitle: title, eventDate: eventDate || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not create the ceremony')
      showToast(`"${title}" is ready to plan`, 'success')
      // /ceremonies/:id opens the planner straight on the new ceremony.
      if (data.ceremony?.id) navigate('/ceremonies/' + encodeURIComponent(data.ceremony.id))
      else setActiveTemplate(null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setCreating(false)
    }
  }

  // ----- One template: preview + create -----
  if (activeTemplate) {
    const { tasks, shopping } = countsOf(activeTemplate)
    return (
      <div className="min-h-screen pb-24 bg-cream">
        <div className="bg-gradient-to-br from-terracotta to-ochre text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
          <button type="button" onClick={() => setActiveTemplate(null)} className="text-sm text-white/80 mb-3 block">← All templates</button>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/90 p-1.5"><CeremonyIcon type={activeTemplate.ceremonyType} size={44} /></div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-2xl break-words">{activeTemplate.title}</h1>
              <p className="text-white/80 text-sm capitalize">{typeLabel(activeTemplate.ceremonyType).toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-sage-50 border border-sage-200 p-4">
              <p className="text-3xl font-bold text-sage-600">{tasks}</p>
              <p className="text-xs font-bold text-ink mt-1">Checklist items</p>
              <p className="text-xs text-ink-muted">Things to do</p>
            </div>
            <div className="rounded-2xl bg-ochre/10 border border-ochre/30 p-4">
              <p className="text-3xl font-bold text-ochre">{shopping}</p>
              <p className="text-xs font-bold text-ink mt-1">Shopping list</p>
              <p className="text-xs text-ink-muted">Things to buy and pay</p>
            </div>
          </div>

          <form onSubmit={createFromTemplate} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-3">
            <p className="text-sm font-bold text-ink">Start a new ceremony from this template</p>
            <p className="text-xs text-ink-muted">Everything is copied fresh: nothing ticked, no amounts paid yet.</p>
            <label className="block">
              <span className="text-xs font-bold text-ink">Ceremony name</span>
              <input
                placeholder="e.g. Umgidi kaSoso 2027"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 w-full border border-ink/30 rounded-soft px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-ink">Date (optional)</span>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1 w-full border border-ink/30 rounded-soft px-3 py-2 text-sm"
              />
            </label>
            <button type="submit" disabled={creating} className="w-full bg-terracotta text-white font-bold py-3 rounded-pill text-sm disabled:opacity-60">
              {creating ? 'Creating…' : 'Create ceremony'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ----- All templates -----
  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button type="button" onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">My Templates</h1>
        <p className="text-white/80 text-sm mt-1">Save a ceremony once, reuse its checklist and shopping list next time.</p>
      </div>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            <Skeleton className="h-24 w-full rounded-soft" />
            <Skeleton className="h-24 w-full rounded-soft" />
            <Skeleton className="h-24 w-full rounded-soft" />
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-terracotta/30 bg-white p-4">
            <p className="text-sm font-bold text-ink">Your templates could not load.</p>
            <p className="text-xs text-ink-muted mt-1">Check your connection and try again.</p>
            <button type="button" onClick={fetchTemplates} className="mt-3 rounded-full bg-terracotta px-4 py-2 text-sm font-bold text-white">Try again</button>
          </div>
        ) : templates.length === 0 ? (
          <EmptyState emoji="📑" title="No templates yet" description="Open a ceremony, go to its summary and tap “Save as template”." />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {templates.map((t) => {
              const { tasks, shopping } = countsOf(t)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTemplate(t)}
                  className="w-full text-left bg-white border-2 border-terracotta/20 rounded-2xl p-4 shadow-soft flex items-center gap-3 active:scale-[0.98] transition-transform"
                >
                  <CeremonyIcon type={t.ceremonyType} size={48} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-base text-ink break-words">{t.title}</span>
                    <span className="block text-xs text-ink-muted capitalize">{typeLabel(t.ceremonyType).toLowerCase()}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      <CountPill value={tasks} label="to do" tone="bg-sage-50 text-sage-600" />
                      <CountPill value={shopping} label="to buy" tone="bg-ochre/10 text-ochre" />
                    </span>
                  </span>
                  <span className="text-terracotta text-xl" aria-hidden="true">›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Templates
