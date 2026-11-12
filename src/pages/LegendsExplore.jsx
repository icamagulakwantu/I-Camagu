import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { isAdminEmail } from '../lib/admin.js'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import HeroHeader from '../components/ui/HeroHeader.jsx'
import { CEREMONY_IMAGE } from '../data/ceremonyImages.js'

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
      <HeroHeader
        image={CEREMONY_IMAGE.ULWALUKO}
        eyebrow="Indlu yamaXhosa · House of AmaXhosa"
        title="Camagu."
        accent="This is who we are."
        subtitle="Kings, heroes, artists and athletes who carried our name, reviewed by the community before they are called history."
        onBack={onBack}
        className="!pb-10"
      />

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
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <button onClick={() => setActiveCategory('')}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold ${!activeCategory ? 'bg-[#1c1612] text-cream' : 'border border-ink/10 bg-white text-ink'}`}>
          All
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold ${activeCategory === cat ? 'bg-[#1c1612] text-cream' : 'border border-ink/10 bg-white text-ink'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((legend) => (
          <div key={legend.id} className="relative overflow-hidden rounded-[22px] border border-ink/[0.06] bg-white p-4 pl-5 shadow-soft">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-terracotta-dark" />
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-terracotta-dark">{legend.category}</p>
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-pill bg-cream-dark text-brand-black/60">
                {STATUS_LABEL[legend.verificationStatus] || 'Pending community review'}
              </span>
            </div>
            <p className="mb-1 font-display text-lg font-semibold leading-tight text-ink">{legend.title}</p>
            <p className="text-[13px] leading-relaxed text-ink-muted">{legend.bodyText}</p>
            {legend.sourceNote && <p className="text-xs text-brand-black/50 mt-2">Source note: {legend.sourceNote}</p>}
            <p className="text-xs text-brand-black/40 mt-2">iCamagu does not treat AI-generated or unverified entries as established historical fact.</p>
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
