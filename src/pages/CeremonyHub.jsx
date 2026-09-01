import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const CEREMONY_META = {
  ULWALUKO: { label: 'Ulwaluko', english: 'Initiation', desc: 'The passage into manhood — provisioning, seclusion and the return.', emoji: '⛰️', image: '/images/ceremonies/ulwaluko.jpg' },
  UMGIDI: { label: 'Umgidi', english: 'Homecoming', desc: 'The feast that welcomes the initiate back into the homestead.', emoji: '🎉', image: '/images/ceremonies/umgidi.jpg' },
  INTAMBO_ENKULU: { label: 'Intambo Enkulu', english: 'The great bond', desc: 'The ceremony that binds two families together.', emoji: '🔗', image: '/images/ceremonies/intambo-enkulu.jpg' },
  UKUKHAPHA: { label: 'Ukukhapha', english: 'Accompanying the departed', desc: 'The rite that walks a loved one to the ancestors.', emoji: '🕊️', image: '/images/ceremonies/ukukhapha.jpg' },
  INKOBE_ZIKA_MAMA: { label: 'Inkobe zikaMama', english: "Mother's harvest", desc: 'A thanksgiving rite honouring a mother\'s provision.', emoji: '🌾', image: '/images/ceremonies/inkobe-zika-mama.jpg' },
  UKUBUYISA: { label: 'Ukubuyisa', english: 'Bringing the spirit home', desc: 'A year on, the departed is called back to the homestead.', emoji: '🏠', image: '/images/ceremonies/ukubuyisa.jpg' },
  UMSEBENZI_WEGQIRHA: { label: 'Umsebenzi weGqirha', english: "Healer's ritual", desc: 'A ceremony marking a traditional healer\'s calling.', emoji: '🌿', image: '/images/ceremonies/umsebenzi.jpg' },
  WEDDING: { label: 'Wedding', english: 'Umtshato', desc: "Lobola talks, the handing over, and the two families' feast.", emoji: '💍', image: '/images/ceremonies/wedding.jpg' },
  GENERAL_EVENT: { label: 'General Event', english: 'Any occasion', desc: 'A gathering the family must mark, on your own terms.', emoji: '📅' },
}

const STATUS_STYLE = {
  PLANNING: 'bg-brand-ochre/15 text-brand-ochre',
  IN_PROGRESS: 'bg-terracotta/15 text-terracotta',
  COMPLETED: 'bg-sage-100 text-sage-700',
}

function CeremonyHub({ onBack, onOpenType, onSelectCeremony }) {
  const { accessToken } = useAuth()
  const [ceremonies, setCeremonies] = useState([])
  const [ceremonyTypes, setCeremonyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('types')

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
        setCeremonyTypes(Array.isArray(typeData) ? typeData.filter(type => type !== 'IMIGIDI' && type !== 'UMSEBENZI_WENKOMO') : [])
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
              className={`${leadMeta.image ? '' : 'wash-ember grain'} card-paper w-full text-left overflow-hidden mb-3 p-5 relative min-h-[220px] flex flex-col justify-end`}>
              {leadMeta.image && (
                <>
                  <img src={leadMeta.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-transparent" />
                </>
              )}
              <div className="relative">
                <span className="eyebrow text-cream/75">{leadMeta.english}</span>
                <h3 className="mt-1 font-display text-2xl text-cream flex items-center gap-2">
                  <span className="text-3xl">{leadMeta.emoji}</span> {leadMeta.label}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/85 max-w-[85%]">{leadMeta.desc}</p>
                <span className="mt-4 inline-block rounded-pill bg-white/15 px-4 py-2 text-[13px] font-bold text-white">
                  Start planning {leadMeta.label} →
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
                  {meta.image ? (
                    <img src={meta.image} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-12 h-12 rounded-full bg-cream flex items-center justify-center text-2xl flex-shrink-0">{meta.emoji || '🎉'}</span>
                  )}
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
        <div className="text-center text-ink-muted py-8">Loading your ceremonies...</div>
      ) : ceremonies.length > 0 ? (
        <div className="space-y-2.5">
          {ceremonies.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCeremony && onSelectCeremony(c.id)}
              className="card-paper grain w-full text-left overflow-hidden p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-ink">{c.title}</p>
                <p className="text-xs text-ink-muted mt-0.5">{c.type.replace(/_/g, ' ')}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-pill flex-shrink-0 ${getStatusStyle(c.status)}`}>
                {c.status || 'PLANNING'}
              </span>
            </button>
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
