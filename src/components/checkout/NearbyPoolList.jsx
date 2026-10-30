import { CATEGORY_LABEL } from '../../data/poolCategories.js'
import Icon from '../Icon.jsx'

function distanceLabel(km) {
  if (km == null) return ''
  if (km < 1) return 'Under 1 km away'
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`
}

// Pools near the typed address, one row each. Tapping a row picks it for that
// kind of item (only one pool per kind); tapping again un-picks it.
export default function NearbyPoolList({ pools, loading, chosenIds, onToggle, areaLabel }) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1].map((i) => <div key={i} className="h-16 rounded-soft bg-cream-dark/60 animate-pulse" />)}
      </div>
    )
  }

  if (!pools.length) {
    return (
      <div className="rounded-soft border border-dashed border-sage-500/50 bg-sage-50 p-3 flex gap-2.5">
        <Icon name="sprout" size={18} color="#4a7a4a" className="shrink-0 mt-0.5" />
        <p className="text-xs text-ink leading-relaxed">
          <span className="font-bold">No open pools near {areaLabel || 'this address'} yet.</span> You'll start the first one, and anyone nearby who shops for the same things joins you automatically. Tap Invite afterwards to bring family and neighbours in.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {pools.map((pool) => {
        const chosen = chosenIds.includes(pool.id)
        const percent = Math.round((pool.progress || 0) * 100)
        return (
          <li key={pool.id}>
            <button
              type="button"
              onClick={() => onToggle(pool)}
              aria-pressed={chosen}
              className={`cursor-pointer w-full text-left rounded-soft border-2 p-3 transition-all active:scale-[0.99] ${chosen ? 'border-sage-500 bg-sage-50 shadow-glow' : 'border-cream-dark bg-white hover:border-sage-500/50'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink truncate">
                  {CATEGORY_LABEL[pool.category]} · {pool.area}
                </p>
                <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${chosen ? 'bg-sage-500 border-sage-500' : 'border-ink/25'}`}>
                  {chosen && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-ink-muted">
                {pool.isMine && <span className="font-black text-terracotta uppercase tracking-wide">You're in this one</span>}
                <span>{distanceLabel(pool.distanceKm)}</span>
                <span>· {pool.members} {pool.members === 1 ? 'member' : 'members'}</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-pill bg-cream-dark overflow-hidden">
                <div className="h-full rounded-pill bg-gradient-to-r from-sage-500 to-brand-ochre" style={{ width: `${Math.max(4, percent)}%` }} />
              </div>
              <p className="mt-1 text-[10px] font-bold text-ink-muted">{pool.currentCases}/{pool.moqTarget} toward the group order ({percent}%)</p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
