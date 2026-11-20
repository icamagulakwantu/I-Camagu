import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import CeremonyIcon from '../components/CeremonyIcon.jsx'
import { CEREMONY_IMAGE, ceremonyImage } from '../data/ceremonyImages.js'
import TemplateInvite from './templates/TemplateInvite.jsx'
import TemplateEditor from './templates/TemplateEditor.jsx'
import ProposalReview from './templates/ProposalReview.jsx'
import TemplateShareCard from './templates/TemplateShareCard.jsx'
import { PENDING_TEMPLATE_KEY } from '../lib/inviteLinks.js'
import { printHtml, templateDocumentHtml, templateRowsToItems } from '../lib/printDoc.js'

const pendingInvite = () => { try { return localStorage.getItem(PENDING_TEMPLATE_KEY) } catch { return null } }
const forgetInvite = () => { try { localStorage.removeItem(PENDING_TEMPLATE_KEY) } catch { /* storage blocked */ } }

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
  // Collaboration views: an invite link, the editor, or the owner's review.
  const [view, setView] = useState(() => (pendingInvite() ? { kind: 'invite', token: pendingInvite() } : null))
  const [shared, setShared] = useState([])

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
  useEffect(() => {
    fetch('/api/ceremonies/templates/shared', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setShared(Array.isArray(data) ? data : []))
      .catch(() => setShared([]))
  }, [accessToken, view])

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

  if (view?.kind === 'invite') return <TemplateInvite token={view.token} onActed={forgetInvite} onBack={() => { forgetInvite(); setView(null) }} onOpenEditor={(id) => { forgetInvite(); const own = templates.find((t) => t.id === id); if (own) { setView(null); openTemplate(own) } else setView({ kind: 'edit', id }) }} />
  if (view?.kind === 'edit') return <TemplateEditor templateId={view.id} onBack={() => setView(null)} />
  if (view?.kind === 'review') return <ProposalReview templateId={view.id} proposalId={view.pid} onBack={() => setView(null)} onDone={() => { setView(null); fetchTemplates() }} />

  // ----- One template: preview + create -----
  if (activeTemplate) {
    const { tasks, shopping } = countsOf(activeTemplate)
    return (
      <div className="min-h-screen pb-24 bg-cream">
        <header className="relative overflow-hidden bg-[#1f3320] px-5 pb-8 pt-6 text-cream">
        <img src={ceremonyImage(activeTemplate.ceremonyType)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1f3320]/40 via-[#1f3320]/55 to-[#1f3320]" />
        <div className="relative">
          <button type="button" onClick={() => setActiveTemplate(null)} className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold text-cream backdrop-blur-sm">← All templates</button>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/90 p-1.5"><CeremonyIcon type={activeTemplate.ceremonyType} size={44} /></div>
            <div className="min-w-0">
              <h1 className="font-display font-semibold text-[2rem] leading-[1.08] break-words">{activeTemplate.title}</h1>
              <p className="text-white/80 text-sm capitalize">{typeLabel(activeTemplate.ceremonyType).toLowerCase()}</p>
            </div>
          </div>
        </div>
      </header>

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

          <button type="button" onClick={() => printHtml(templateDocumentHtml({ title: activeTemplate.title, typeName: typeLabel(activeTemplate.ceremonyType).toLowerCase(), items: templateRowsToItems(activeTemplate.checklistItems) }))} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-[#1f3320]/20 bg-white text-sm font-extrabold text-[#1f3320]">
            Download as PDF
          </button>

          <TemplateShareCard template={activeTemplate} onReview={(pid) => setView({ kind: 'review', id: activeTemplate.id, pid })} />

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
      <header className="relative overflow-hidden bg-[#1f3320] px-5 pb-8 pt-6 text-cream">
        <img src={CEREMONY_IMAGE.UMGIDI} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1f3320]/40 via-[#1f3320]/55 to-[#1f3320]" />
        <div className="relative">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold text-cream backdrop-blur-sm">← Back</button>
        <h1 className="font-display font-semibold text-[2rem] leading-[1.08]">My Templates</h1>
        <p className="text-white/80 text-sm mt-1">Save a ceremony once, reuse its checklist and shopping list next time.</p>
      </div>
      </header>

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
                      {t.pendingRequests > 0 && <CountPill value={t.pendingRequests} label={t.pendingRequests === 1 ? 'request' : 'requests'} tone="bg-terracotta text-white" />}
                      {t.openProposals > 0 && <CountPill value={t.openProposals} label="to review" tone="bg-[#1f3320] text-cream" />}
                    </span>
                  </span>
                  <span className="text-terracotta text-xl" aria-hidden="true">›</span>
                </button>
              )
            })}
          </div>
        )}

        {shared.length > 0 && (
          <section aria-label="Shared with me" className="mt-8">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-terracotta-dark">Owabelene nam · Shared with me</p>
            <div className="mt-2 grid grid-cols-1 gap-3">
              {shared.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={t.role !== 'editor'}
                  onClick={() => setView({ kind: 'edit', id: t.id })}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-soft disabled:opacity-80"
                >
                  <CeremonyIcon type={t.ceremonyType} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-base font-bold text-ink">{t.title}</span>
                    <span className="block text-xs text-ink-muted">{t.ownerName}&rsquo;s template · {t.role === 'editor' ? (t.myProposalStatus === 'OPEN' ? 'your changes are waiting for approval' : 'you can suggest changes') : 'waiting for approval to edit'}</span>
                  </span>
                  {t.role === 'editor' && <span className="text-xl text-terracotta" aria-hidden="true">›</span>}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default Templates
