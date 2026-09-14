import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { isAdminEmail } from '../lib/admin.js'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'

const STATUS_LABEL = {
  VERIFIED: 'Verified',
  TRADITIONAL_ATTRIBUTION: 'Traditional attribution',
  DISPUTED: 'Disputed',
}

function LegendsExplore({ onBack }) {
  const { accessToken, user } = useAuth()
  const { showToast } = useToast()
  const [legends, setLegends] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')

  const isAdmin = isAdminEmail(user?.email)

  const fetchLegends = () => {
    fetch('/api/legends')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error()
        setLegends(Array.isArray(data) ? data : [])
      })
      .catch(() => setLegends([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLegends() }, [])

  const verifyLegend = async (legendId, verificationStatus) => {
    try {
      const res = await fetch('/api/legends/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ legendId, verificationStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update legend')
      showToast('Legend entry updated', 'success')
      fetchLegends()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const categories = [...new Set(legends.map(l => l.category))]
  const filtered = activeCategory ? legends.filter(l => l.category === activeCategory) : legends

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">House of AmaXhosa</h1>
        <p className="text-white/70 text-sm mt-1">Camagu. This is who we are.</p>
      </div>

      <div className="px-4 mt-4">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-soft" />
          <Skeleton className="h-24 w-full rounded-soft" />
        </div>
      ) : legends.length === 0 ? (
        <EmptyState emoji="📜" title="No entries yet" description="The House of AmaXhosa is still being built — check back soon." />
      ) : (
      <>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button onClick={() => setActiveCategory('')}
          className={`whitespace-nowrap px-3 py-1 text-xs font-bold border rounded-pill ${!activeCategory ? 'bg-brand-blue text-brand-cream border-brand-blue' : 'bg-white border-brand-black/30'}`}>
          ALL
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap px-3 py-1 text-xs font-bold border rounded-pill ${activeCategory === cat ? 'bg-brand-blue text-brand-cream border-brand-blue' : 'bg-white border-brand-black/30'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((legend) => (
          <div key={legend.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-black uppercase text-brand-ochre">{legend.category}</p>
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-pill bg-cream-dark text-brand-black/60">
                {STATUS_LABEL[legend.verificationStatus] || 'Pending community review'}
              </span>
            </div>
            <p className="font-bold text-sm mb-1">{legend.title}</p>
            <p className="text-xs text-brand-black/70">{legend.bodyText}</p>
            {legend.sourceNote && <p className="text-[10px] text-brand-black/50 mt-2">Source note: {legend.sourceNote}</p>}
            <p className="text-[10px] text-brand-black/40 mt-2">iCamagu does not treat AI-generated or unverified entries as established historical fact.</p>
            {isAdmin && legend.verificationStatus !== 'VERIFIED' && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => verifyLegend(legend.id, 'VERIFIED')}
                  className="text-xs bg-brand-blue text-brand-cream font-bold px-3 py-1.5 rounded-pill"
                >
                  Verify (Admin)
                </button>
                <button
                  onClick={() => verifyLegend(legend.id, 'DISPUTED')}
                  className="text-xs bg-white border border-brand-black/30 text-brand-black/70 font-bold px-3 py-1.5 rounded-pill"
                >
                  Mark disputed
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      </>
      )}
      </div>
    </div>
  )
}

export default LegendsExplore
