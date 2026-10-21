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

// A closed "Find stokvels near you" bar. Opening it shows stokvels that chose
// to be shown, with the ones in the person's own area first. "Ask to join"
// tells the creator, who then sends an invitation.
export default function NearbyStokvels() {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [asked, setAsked] = useState({})

  // Only asks the server once the person opens the bar.
  useEffect(() => {
    if (!open || data) return
    let cancelled = false
    const load = async () => {
      const res = await fetch('/api/stokvels/nearby', { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null)
      const body = res?.ok ? await res.json() : { hasAddress: true, stokvels: [] }
      if (!cancelled) setData(body)
    }
    load()
    return () => { cancelled = true }
  }, [open, data, accessToken])

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

  return (
    <div className="px-4 pt-3 bg-cream">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`w-full bg-white border-2 border-sage-500/40 rounded-pill py-3 px-4 text-left font-bold text-ink flex items-center justify-between ${pressable}`}>
        <span>Find stokvels near you</span>
        <span className="text-sage-600 text-sm">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && !data && <p className="text-sm text-ink-muted mt-3">Looking...</p>}

      {open && data && (
        <div className="mt-3 pb-2">
          {!data.hasAddress && (
            <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-3">
              <p className="font-bold text-ink">Add your area to see stokvels close to you</p>
              <p className="text-sm text-ink-muted mt-1">Open More, then Profile, and fill in your address. We only use it to put groups in your area first.</p>
            </div>
          )}
          {data.stokvels.length === 0 && (
            <p className="text-sm text-ink-muted">No stokvels are shown to the public yet. Creators can switch this on in the Members tab.</p>
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
      )}
    </div>
  )
}
