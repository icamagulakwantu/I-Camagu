import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const PRIMARY_CEREMONIES = [
  { type: 'ULWALUKO', label: 'Ulwaluko', desc: 'Initiation planning, practitioners, blankets', emoji: '⛰️' },
  { type: 'UMGIDI', label: 'Umgidi', desc: 'Homecoming feast, kraal seating, alcohol', emoji: '🎉' },
  { type: 'INTAMBO_ENKULU', label: 'Intambo Enkulu', desc: 'Family bonding, protective rituals', emoji: '🔗' },
]

const IMISEBENZI_YENKOMO = [
  { type: 'UKUKHAPHA', label: 'Ukukhapha', desc: 'Accompanying an ancestor\'s spirit' },
  { type: 'UKUBUYISA', label: 'Ukubuyisa', desc: 'Bringing the ancestor\'s spirit home' },
  { type: 'INKOBE_ZIKA_MAMA', label: 'Inkobe zikaMama', desc: 'Thanksgiving for maternal figures' },
  { type: 'UMSEBENZI_WEGQIRHA', label: 'Umsebenzi wegqirha', desc: 'Healer milestone, intlombe dance' },
]

// NEW: added props onCreateNew and onSelectCeremony
function CeremonyHub({ onBack, onOpenType, onCreateNew, onSelectCeremony }) {
  const { accessToken } = useAuth()
  const [showImisebenzi, setShowImisebenzi] = useState(false)
  const [ceremonies, setCeremonies] = useState([])
  const [loading, setLoading] = useState(true) // NEW: loading state

  useEffect(() => {
    setLoading(true)
    fetch('/api/ceremonies/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch ceremonies')
        return res.json()
      })
      .then((data) => setCeremonies(Array.isArray(data) ? data : []))
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl">Ceremonies</h1>
            <p className="text-white/70 text-sm mt-1">Plan, save, and execute — from first checklist to final day.</p>
          </div>
          {/* NEW: Create Ceremony button */}
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="bg-white text-sage-700 font-bold px-4 py-2 rounded-soft text-sm shadow-md hover:bg-sage-50 transition"
            >
              + New
            </button>
          )}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {PRIMARY_CEREMONIES.map((c) => (
          <button key={c.type} onClick={() => onOpenType(c.type)}
            className="w-full bg-white border-2 border-ink rounded-soft p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform">
            <span className="text-3xl">{c.emoji}</span>
            <div>
              <p className="font-bold text-ink">{c.label}</p>
              <p className="text-xs text-ink-muted">{c.desc}</p>
            </div>
          </button>
        ))}

        <button onClick={() => setShowImisebenzi(!showImisebenzi)}
          className="w-full bg-white border-2 border-terracotta rounded-soft p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🐄</span>
            <div>
              <p className="font-bold text-ink">Imisebenzi yeNkomo</p>
              <p className="text-xs text-ink-muted">4 ceremonies — tap to expand</p>
            </div>
          </div>
          <span className="text-ink-muted">{showImisebenzi ? '▲' : '▼'}</span>
        </button>

        {showImisebenzi && (
          <div className="pl-4 space-y-2">
            {IMISEBENZI_YENKOMO.map((c) => (
              <button key={c.type} onClick={() => onOpenType(c.type)}
                className="w-full bg-sage-50 border-2 border-sage-200 rounded-soft p-3 flex items-center gap-3 text-left">
                <div>
                  <p className="font-bold text-sm text-ink">{c.label}</p>
                  <p className="text-xs text-ink-muted">{c.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
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
              className="bg-white border border-ink/15 rounded-soft p-3 mb-2 flex items-center justify-between cursor-pointer hover:border-sage-400 transition"
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
