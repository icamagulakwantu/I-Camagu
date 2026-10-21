import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

const TYPE_LABEL = {
  ALCOHOL_BULK_POOL: 'Bulk buying',
  UMGALELO_ROTATING: 'Monthly savings',
  CEREMONY_SAVINGS: 'Ceremony savings',
  EXISTING_STOKVEL_UPGRADE: 'Community stokvel',
  RECIPROCAL_GIFTING: 'Gift sharing',
}

// Stokvels that chose to be shown, with the ones in the person's own area
// first. "Ask to join" tells the creator, who then sends an invitation.
export default function NearbyStokvels() {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [asked, setAsked] = useState({})

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const res = await fetch('/api/stokvels/nearby', { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null)
      const body = res?.ok ? await res.json() : { hasAddress: true, stokvels: [] }
      if (!cancelled) setData(body)
    }
    load()
    return () => { cancelled = true }
  }, [accessToken])

  const ask = async (stokvel) => {
    setBusyId(stokvel.id)
    try {
      const res = await fetch(`/api/stokvels/${stokvel.id}/ask-to-join`, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not send your request')
      setAsked((a) => ({ ...a, [stokvel.id]: true }))
      showToast(body.message, 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (!data) return null
  if (data.stokvels.length === 0 && data.hasAddress) return null

  return (
    <div className="px-4 pt-2 pb-4 bg-cream">
      <p className="text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">Stokvels near you</p>

      {!data.hasAddress && (
        <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-3">
          <p className="font-bold text-ink">Add your area to see stokvels close to you</p>
          <p className="text-sm text-ink-muted mt-1">Open More, then Profile, and fill in your address. We only use it to show groups in your area.</p>
        </div>
      )}

      <div className="space-y-3">
        {data.stokvels.map((s) => (
          <div key={s.id} className="bg-white border-2 border-terracotta/15 rounded-soft p-4 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <p className="font-display font-bold text-lg text-ink">{s.name}</p>
              {s.isNearYou && (
                <span className="text-[10px] font-black uppercase bg-sage-50 text-sage-700 px-2 py-1 rounded-pill flex-shrink-0">Near you</span>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-0.5">{TYPE_LABEL[s.type] || 'Stokvel'} · {s.area} · {s.memberCount} member{s.memberCount === 1 ? '' : 's'}</p>
            <p className="text-sm text-ink mt-2">{s.purpose}</p>
            <button type="button" disabled={busyId === s.id || asked[s.id]} onClick={() => ask(s)}
              className={`mt-3 w-full bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
              {asked[s.id] ? 'Request sent' : 'Ask to join'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
