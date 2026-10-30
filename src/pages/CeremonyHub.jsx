import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import CeremonyIcon from '../components/CeremonyIcon.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Icon from '../components/Icon.jsx'

// Founder-supplied photos, hosted on the Hercules CDN.
const ULWALUKO_IMAGE = 'https://hercules-cdn.com/file_DyjWbFXGDDgiqgyH6wrcRaEx'
const UMGIDI_IMAGE = 'https://hercules-cdn.com/file_wxyYBh6l6xbEhksr09BuCEsR'

const CEREMONY_META = {
  ULWALUKO: { label: 'Ulwaluko', english: 'Initiation', desc: 'The passage into manhood — provisioning, seclusion and the return.', image: ULWALUKO_IMAGE },
  UMGIDI: { label: 'Umgidi', english: 'Homecoming', desc: 'The feast that welcomes the initiate back into the homestead.', image: UMGIDI_IMAGE },
  INTAMBO_ENKULU: { label: 'Intambo Enkulu', english: 'The great bond', desc: 'The ceremony that binds two families together.', image: '/images/ceremonies/intambo-enkulu.jpg' },
  UKUKHAPHA: { label: 'Ukukhapha', english: 'Accompanying the departed', desc: 'The rite that walks a loved one to the ancestors.', image: '/images/ceremonies/ukukhapha.jpg' },
  INKOBE_ZIKA_MAMA: { label: 'Inkobe zikaMama', english: "Mother's harvest", desc: "A thanksgiving rite honouring a mother's provision.", image: '/images/ceremonies/inkobe-zika-mama.jpg' },
  UKUBUYISA: { label: 'Ukubuyisa', english: 'Bringing the spirit home', desc: 'A year on, the departed is called back to the homestead.', image: '/images/ceremonies/ukubuyisa.jpg' },
  UMSEBENZI_WEGQIRHA: { label: 'Umsebenzi weGqirha', english: "Healer's ritual", desc: "A ceremony marking a traditional healer's calling.", image: '/images/ceremonies/umsebenzi.jpg' },
  WEDDING: { label: 'Wedding', english: 'Umtshato', desc: "Lobola talks, the handing over, and the two families' feast.", image: '/images/ceremonies/wedding.jpg' },
  GENERAL_EVENT: { label: 'General Event', english: 'Nayiphi na', desc: 'A gathering the family must mark, on your own terms.' },
}

const STATUS_STYLE = {
  PLANNING: 'bg-brand-ochre/15 text-ochre-dark',
  IN_PROGRESS: 'bg-terracotta/15 text-terracotta',
  COMPLETED: 'bg-sage-100 text-sage-700',
}

// Plain words instead of database codes like IN_PROGRESS.
const STATUS_LABEL = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'Under way',
  COMPLETED: 'Done',
}

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.97]'

function CeremonyHub({ onBack, onOpenType, onSelectCeremony, onGoToHierarchy }) {
  const { accessToken } = useAuth()
  const [ceremonies, setCeremonies] = useState([])
  const [ceremonyTypes, setCeremonyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('types')
  const [leadImageFailed, setLeadImageFailed] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/ceremonies/my', { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch('/api/ceremonies/types', { headers: { Authorization: `Bearer ${accessToken}` } }),
    ])
      .then(async ([ceremonyRes, typeRes]) => {
        if (!ceremonyRes.ok) throw new Error('Failed to fetch ceremonies')
        const ceremonyData = await ceremonyRes.json()
        const typeData = typeRes.ok ? await typeRes.json() : []
        const mine = Array.isArray(ceremonyData) ? ceremonyData : []
        setCeremonies(mine)
        setCeremonyTypes(Array.isArray(typeData) ? typeData : [])
        // Someone who already has a ceremony usually comes back to continue
        // it, so open on "Mine" for them instead of the catalogue.
        if (mine.length > 0) setTab('mine')
      })
      .catch(err => console.error('Error fetching ceremonies:', err))
      .finally(() => setLoading(false))
  }, [accessToken])

  const statusKey = (status) => status?.toUpperCase() || 'PLANNING'
  const getStatusStyle = (status) => STATUS_STYLE[statusKey(status)] || 'bg-ink/10 text-ink-muted'

  const deleteCeremony = async (id) => {
    setDeletingId(id)
    try {
      const res = await fetch('/api/ceremonies/' + id, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Could not delete ceremony') }
      setCeremonies(prev => prev.filter(c => c.id !== id))
      setConfirmDeleteId(null)
    } catch (err) {
      console.error('Error deleting ceremony:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const [leadType, ...restTypes] = ceremonyTypes
  const leadMeta = leadType ? (CEREMONY_META[leadType] || {}) : null

  const TABS = [
    { id: 'types', xhosa: 'Yonke imisebenzi', english: 'All rites' },
    { id: 'mine', xhosa: `Eyam (${ceremonies.length})`, english: 'Mine' },
  ]

  return (
    <div className="min-h-screen pb-28 bg-cream px-5 pt-6 max-w-md mx-auto">
      <PageHeader
        onBack={onBack}
        eyebrow="Imisebenzi"
        title="Ceremonies"
        subtitle="Yonke inkonzo inengoma yayo — qala kulowo oyenzayo."
        note="Every rite has its own rhythm. Start from the one you're holding."
      />

      <div className="flex rounded-pill border border-ink/[0.08] bg-white p-1 mb-6 shadow-soft" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-pill py-2 px-2 transition-colors duration-200 ${tab === t.id ? 'bg-ink text-white shadow-soft' : 'text-ink-muted'}`}
          >
            <span className="block text-[13px] font-bold">{t.xhosa}</span>
            <span className={`block text-[10px] font-medium ${tab === t.id ? 'text-white/70' : 'text-ink-muted/80'}`}>{t.english}</span>
          </button>
        ))}
      </div>

      {tab === 'types' ? (
        <>
          {leadMeta && (
            <button onClick={() => onOpenType(leadType)}
              className={`${leadMeta.image && !leadImageFailed ? '' : 'wash-ember grain'} w-full text-left overflow-hidden mb-4 rounded-[26px] relative min-h-[260px] flex flex-col justify-end shadow-card ${pressable}`}>
              {leadMeta.image && !leadImageFailed && (
                <>
                  <img src={leadMeta.image} alt="" onError={() => setLeadImageFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1f1a15]/95 via-[#1f1a15]/45 to-transparent" />
                </>
              )}
              <div className="relative p-5">
                <span className="eyebrow text-ochre-light">{leadMeta.english}</span>
                <h3 className="mt-1 font-display text-[1.75rem] font-semibold text-cream flex items-center gap-2.5">
                  <CeremonyIcon type={leadType} tone="light" size={40} /> {leadMeta.label}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/85 max-w-[88%]">{leadMeta.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-cream px-4 py-2 text-[13px] font-bold text-ink">
                  Start planning {leadMeta.label} <Icon name="arrowRight" size={14} />
                </span>
              </div>
            </button>
          )}

          <div className="space-y-2.5">
            {restTypes.map((type) => {
              const meta = CEREMONY_META[type] || {}
              return (
                <button key={type} onClick={() => onOpenType(type)}
                  className={`card-paper w-full text-left overflow-hidden p-4 flex items-center gap-4 ${pressable}`}>
                  <CeremonyIcon type={type} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[17px] font-semibold text-ink">{meta.label || type.replace(/_/g, ' ')}</p>
                    {meta.english && <p className="text-[10px] uppercase tracking-[0.12em] text-ochre-dark font-bold mt-0.5">{meta.english}</p>}
                    <p className="text-xs text-ink-muted mt-1 line-clamp-1">{meta.desc || 'Ceremony planning and preparation'}</p>
                  </div>
                  <Icon name="arrowRight" size={16} color="#6b645a" />
                </button>
              )
            })}
          </div>
        </>
      ) : loading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-20 w-full rounded-soft" />
          <Skeleton className="h-20 w-full rounded-soft" />
        </div>
      ) : ceremonies.length > 0 ? (
        <div className="space-y-3">
          {ceremonies.map((c) => {
            const meta = CEREMONY_META[c.type] || {}
            return (
              <div key={c.id} className="card-paper card-spine overflow-hidden">
                <div className="w-full text-left p-4 pl-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectCeremony && onSelectCeremony(c.id)}
                    className={`flex flex-1 min-w-0 items-center gap-3 text-left ${pressable}`}
                  >
                    <CeremonyIcon type={c.type} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-semibold text-ink">{c.title}</span>
                      <span className="block text-xs text-ink-muted mt-0.5">{meta.label || c.type.replace(/_/g, ' ')}</span>
                    </span>
                  </button>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-pill flex-shrink-0 ${getStatusStyle(c.status)}`}>
                    {STATUS_LABEL[statusKey(c.status)] || c.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(c.id)}
                    aria-label={`Delete ${c.title}`}
                    className={`flex-shrink-0 p-2 rounded-pill hover:bg-terracotta/10 ${pressable}`}
                  >
                    <Icon name="trash" size={15} color="#6b645a" />
                  </button>
                </div>

                {confirmDeleteId === c.id && (
                  <div className="border-t border-ink/[0.06] px-5 py-3 bg-terracotta/5">
                    <p className="text-xs font-bold text-ink mb-1">Delete this ceremony permanently?</p>
                    <p className="text-[11px] text-ink-muted mb-2.5">This removes the ceremony, checklist, budget and pledges. This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => deleteCeremony(c.id)}
                        disabled={deletingId === c.id}
                        className={`flex-1 bg-terracotta-dark text-white font-bold py-2 rounded-pill text-xs ${pressable} disabled:opacity-50`}
                      >
                        {deletingId === c.id ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className={`flex-1 bg-cream-dark font-bold py-2 rounded-pill text-xs text-ink ${pressable}`}
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                )}

                {onGoToHierarchy && (
                  <button
                    type="button"
                    onClick={() => onGoToHierarchy(c.id)}
                    className="w-full border-t border-ink/[0.06] px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-cream/60 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-ink leading-tight">Who brings what</span>
                      <span className="block text-[11px] text-ink-muted mt-0.5">Give alcohol, food & supplies to each of the 14 groups</span>
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-1 text-xs font-bold text-terracotta">
                      Open <Icon name="arrowRight" size={12} color="#c45c26" />
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-paper text-center px-6 py-10">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-terracotta/10">
            <Icon name="calendar" size={24} color="#c45c26" />
          </span>
          <p className="font-display text-lg font-semibold text-ink">Akukho misebenzi okwangoku</p>
          <p className="text-xs text-ink-muted mt-1">No ceremonies yet. Pick a rite to start your plan, checklist and budget.</p>
          <button
            type="button"
            onClick={() => setTab('types')}
            className={`mt-4 rounded-pill bg-terracotta px-5 py-2.5 text-sm font-bold text-white ${pressable}`}
          >
            Choose a ceremony
          </button>
        </div>
      )}
    </div>
  )
}

export default CeremonyHub
