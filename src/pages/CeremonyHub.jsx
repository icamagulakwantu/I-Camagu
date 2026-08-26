import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const CEREMONY_META = {
  ULWALUKO: { label: 'Ulwaluko', desc: 'Initiation planning and preparation', emoji: '⛰️' },
  UMGIDI: { label: 'Umgidi', desc: 'Homecoming celebration and preparation', emoji: '🎉' },
  INTAMBO_ENKULU: { label: 'Intambo Enkulu', desc: 'Ceremony planning and preparation', emoji: '🔗' },
  UKUKHAPHA: { label: 'Ukukhapha', desc: 'Ceremony planning and preparation', emoji: '🕊️' },
  INKOBE_ZIKA_MAMA: { label: 'Inkobe zikaMama', desc: 'Ceremony planning and preparation', emoji: '🌾' },
  UKUBUYISA: { label: 'Ukubuyisa', desc: 'Ceremony planning and preparation', emoji: '🏠' },
  UMSEBENZI_WEGQIRHA: { label: 'Umsebenzi weGqirha', desc: 'Ceremony planning and preparation', emoji: '🌿' },
  WEDDING: { label: 'Wedding', desc: 'Marriage celebration planning', emoji: '💍' },
  GENERAL_EVENT: { label: 'General Event', desc: 'Custom ceremony or event planning', emoji: '📅' },
}

function CeremonyHub({ onBack, onOpenType, onSelectCeremony }) {
  const { accessToken } = useAuth()
  const [ceremonies, setCeremonies] = useState([])
  const [ceremonyTypes, setCeremonyTypes] = useState([])
  const [loading, setLoading] = useState(true) // NEW: loading state

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
  }, [accessToken]) // added dependency

  // Helper to get status badge colour
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PLANNING': return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <div>
          <h1 className="font-display font-bold text-2xl">Ceremonies</h1>
          <p className="text-white/70 text-sm mt-1">Plan, save, and execute — from first checklist to final day.</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {ceremonyTypes.map((type) => {
          const meta = CEREMONY_META[type] || {}
          return (
          <button key={type} onClick={() => onOpenType(type)}
            className="w-full bg-white border-2 border-terracotta/25 rounded-soft p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform">
            <span className="w-12 h-12 rounded-full bg-cream flex items-center justify-center text-2xl flex-shrink-0">{meta.emoji || '🎉'}</span>
            <div>
              <p className="font-bold text-ink">{meta.label || type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-ink-muted">{meta.desc || 'Ceremony planning'}</p>
            </div>
          </button>
          )
        })}
      </div>

      {loading ? (
        <div className="px-4 mt-6 text-center text-ink-muted">Loading your ceremonies...</div>
      ) : ceremonies.length > 0 ? (
        <div className="px-4 mt-6">
          <p className="text-xs font-black uppercase text-ink-muted mb-2">Your Active Ceremonies</p>
          {ceremonies.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCeremony && onSelectCeremony(c.id)}
              className="bg-white border border-terracotta/15 rounded-soft p-3 mb-2 flex items-center justify-between cursor-pointer hover:border-sage-400 transition"
            >
              <div>
                <p className="font-bold text-sm">{c.title}</p>
                <p className="text-xs text-ink-muted">{c.type.replace(/_/g, ' ')}</p>
              </div>
              {/* NEW: Status badge */}
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(c.status)}`}>
                {c.status || 'PLANNING'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 mt-6 text-center text-ink-muted">
          No ceremonies yet. Tap a ceremony type above to start planning.
        </div>
      )}
    </div>
  )
}

export default CeremonyHub