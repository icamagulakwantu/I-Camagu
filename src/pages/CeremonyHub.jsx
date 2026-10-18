import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import CeremonyIcon from '../components/CeremonyIcon.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'

const CEREMONY_META = {
  ULWALUKO: { label: 'Ulwaluko', english: 'Initiation', desc: 'The passage into manhood — provisioning, seclusion and the return.', image: '/images/ceremonies/ulwaluko.jpg' },
  UMGIDI: { label: 'Umgidi', english: 'Homecoming', desc: 'The feast that welcomes the initiate back into the homestead.', image: '/images/ceremonies/umgidi.jpg' },
  INTAMBO_ENKULU: { label: 'Intambo Enkulu', english: 'The great bond', desc: 'The ceremony that binds two families together.', image: '/images/ceremonies/intambo-enkulu.jpg' },
  UKUKHAPHA: { label: 'Ukukhapha', english: 'Accompanying the departed', desc: 'The rite that walks a loved one to the ancestors.', image: '/images/ceremonies/ukukhapha.jpg' },
  INKOBE_ZIKA_MAMA: { label: 'Inkobe zikaMama', english: "Mother's harvest", desc: "A thanksgiving rite honouring a mother's provision.", image: '/images/ceremonies/inkobe-zika-mama.jpg' },
  UKUBUYISA: { label: 'Ukubuyisa', english: 'Bringing the spirit home', desc: 'A year on, the departed is called back to the homestead.', image: '/images/ceremonies/ukubuyisa.jpg' },
  UMSEBENZI_WEGQIRHA: { label: 'Umsebenzi weGqirha', english: "Healer's ritual", desc: "A ceremony marking a traditional healer's calling.", image: '/images/ceremonies/umsebenzi.jpg' },
  WEDDING: { label: 'Wedding', english: 'Umtshato', desc: "Lobola talks, the handing over, and the two families' feast.", image: '/images/ceremonies/wedding.jpg' },
  GENERAL_EVENT: { label: 'General Event', english: 'Any occasion', desc: 'A gathering the family must mark, on your own terms.' },
}

const STATUS_STYLE = {
  PLANNING: 'bg-brand-ochre/15 text-brand-ochre',
  IN_PROGRESS: 'bg-terracotta/15 text-terracotta',
  COMPLETED: 'bg-sage-100 text-sage-700',
}

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.97]'

function CeremonyHub({ onBack, onOpenType, onSelectCeremony, onGoToHierarchy }) {
  const { accessToken } = useAuth()
  const [ceremonies, setCeremonies] = useState([])
  const [ceremonyTypes, setCeremonyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('types')
  const [leadImageFailed, setLeadImageFailed] = useState(false)

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
        setCeremonies(Array.isArray(ceremonyData) ? ceremonyData : [])
        setCeremonyTypes(Array.isArray(typeData) ? typeData : [])
      })
      .catch(err => console.error('Error fetching ceremonies:', err))
      .finally(() => setLoading(false))
  }, [accessToken])

  const getStatusStyle = (status) => STATUS_STYLE[status?.toUpperCase()] || 'bg-ink/10 text-ink-muted'

  const [leadType, ...restTypes] = ceremonyTypes
  const leadMeta = leadType ? (CEREMONY_META[leadType] || {}) : null

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <button onClick={onBack} className="text-sm text-ink-muted mb-4 block">← Back</button>
      <p className="eyebrow mb-1">Imisebenzi</p>
      <h1 className="font-display font-bold text-3xl text-ink">Ceremonies</h1>
      <p className="text-ink-muted text-sm mt-2 mb-4">Every rite has its own rhythm — start from the one you're holding.</p>

      <div className="flex rounded-pill border-2 border-terracotta/20 bg-white p-1 mb-5">
        <button type="button" onClick={() => setTab('types')}
          className={`flex-1 rounded-pill py-2 text-[13px] font-bold transition-colors ${tab === 'types' ? 'bg-terracotta text-white' : 'text-ink-muted'}`}>
          All rites
        </button>
        <button type="button" onClick={() => setTab('mine')}
          className={`flex-1 rounded-pill py-2 text-[13px] font-bold transition-colors ${tab === 'mine' ? 'bg-terracotta text-white' : 'text-ink-muted'}`}>
          Mine ({ceremonies.length})
        </button>
      </div>

      {tab === 'types' ? (
        <>
          {leadMeta && (
            <button onClick={() => onOpenType(leadType)}
              className={`${leadMeta.image && !leadImageFailed ? '' : 'wash-ember grain'} card-paper w-full text-left overflow-hidden mb-3 p-5 relative min-h-[220px] flex flex-col justify-end`}>
              {leadMeta.image && !leadImageFailed && (
                <>
                  <img src={leadMeta.image} alt="" onError={() => setLeadImageFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-transparent" />
                </>
              )}
              <div className="relative">
                <span className="eyebrow text-cream/75">{leadMeta.english}</span>
                <h3 className="mt-1 font-display text-2xl text-cream flex items-center gap-2.5">
                  <CeremonyIcon type={leadType} tone="light" size={40} /> {leadMeta.label}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/85 max-w-[85%]">{leadMeta.desc}</p>
                <span className="mt-4 inline-block rounded-pill bg-white/15 px-4 py-2 text-[13px] font-bold text-white">
                  Start planning {leadMeta.label} &rarr;
                </span>
              </div>
            </button>
          )}

          <div className="space-y-2.5">
            {restTypes.map((type) => {
              const meta = CEREMONY_META[type] || {}
              return (
                <button key={type} onClick={() => onOpenType(type)}
                  className="card-paper grain w-full text-left overflow-hidden p-4 flex items-center gap-4 active:scale-[0.98] transition-transform">
                  <CeremonyIcon type={type} size={48} />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-ink">{meta.label || type.replace(/_/g, ' ')}</p>
                    {meta.english && <p className="text-[10px] uppercase tracking-[0.1em] text-brand-ochre font-bold mt-0.5">{meta.english}</p>}
                    <p className="text-xs text-ink-muted mt-1 line-clamp-1">{meta.desc || 'Ceremony planning and preparation'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : loading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full rounded-soft" />
          <Skeleton className="h-16 w-full rounded-soft" />
        </div>
      ) : ceremonies.length > 0 ? (
        <div className="space-y-2.5">
          {ceremonies.map((c) => (
            <div key={c.id} className="card-paper grain overflow-hidden">
              {/* Ceremony summary row */}
              <button
                type="button"
                onClick={() => onSelectCeremony && onSelectCeremony(c.id)}
                className={`w-full text-left p-4 flex items-center justify-between gap-3 ${pressable}`}
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-ink">{c.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{c.type.replace(/_/g, ' ')}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-pill flex-shrink-0 ${getStatusStyle(c.status)}`}>
                  {c.status || 'PLANNING'}
                </span>
              </button>

              {/* Hierarchy prompt — the missing connective tissue between
                  planning a ceremony and allocating items to each group */}
              {onGoToHierarchy && (
                <div className="border-t border-terracotta/10 px-4 py-3 flex items-center justify-between gap-3 bg-terracotta/3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink leading-tight">Allocate items per group</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">Assign alcohol, food & supplies to each of the 14 groups</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoToHierarchy(c.id)}
                    className={`flex-shrink-0 bg-terracotta text-white text-[11px] font-bold px-3 py-1.5 rounded-pill ${pressable}`}
                  >
                    <span className="flex items-center gap-1">
                      Open <Icon name="arrowRight" size={11} color="#fff" />
                    </span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-ink-muted py-8">
          No ceremonies yet. Switch to "All rites" to start planning one.
        </div>
      )}
    </div>
  )
}

export default CeremonyHub
