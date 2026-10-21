import { useCallback, useEffect, useState } from 'react'
import Stokvels from './Stokvels.jsx'
import MyStokvelInvites from '../components/MyStokvelInvites.jsx'
import NearbyStokvels from '../components/NearbyStokvels.jsx'
import StokvelWelcomeTour from '../components/StokvelWelcomeTour.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const seenKey = (userId, stokvelId) => `icamagu_tour_seen:${userId}:${stokvelId}`
const baselineKey = (userId) => `icamagu_tour_baseline:${userId}`

// The Stokvels screen with extras on top: invitations waiting for the person,
// a "find stokvels near you" bar, and a one-time welcome tour for any stokvel
// they have just joined.
export default function StokvelsWithInvites(props) {
  const { accessToken, user } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)
  const [tourStokvelId, setTourStokvelId] = useState(null)

  // Finds a stokvel the person has not toured yet. The first time we ever run
  // for a person, every stokvel they are already in counts as seen, so only
  // stokvels joined from now on get a tour. Ones they created are skipped.
  useEffect(() => {
    if (!accessToken || !user?.id) return
    let cancelled = false
    const check = async () => {
      const res = await fetch('/api/stokvels/my', { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null)
      if (!res?.ok || cancelled) return
      const list = await res.json()
      if (!Array.isArray(list)) return
      const firstRun = !localStorage.getItem(baselineKey(user.id))
      if (firstRun) {
        list.forEach((s) => localStorage.setItem(seenKey(user.id, s.id), '1'))
        localStorage.setItem(baselineKey(user.id), '1')
        return
      }
      const fresh = list.find((s) => !localStorage.getItem(seenKey(user.id, s.id)))
      if (!fresh) return
      if (fresh.organiserId === user.id) {
        localStorage.setItem(seenKey(user.id, fresh.id), '1')
        return
      }
      setTourStokvelId(fresh.id)
    }
    check()
    return () => { cancelled = true }
  }, [accessToken, user?.id, refreshKey])

  const closeTour = useCallback(() => {
    if (tourStokvelId && user?.id) localStorage.setItem(seenKey(user.id, tourStokvelId), '1')
    setTourStokvelId(null)
  }, [tourStokvelId, user?.id])

  return (
    <>
      <div className="px-4 pt-6 bg-cream empty:hidden">
        <MyStokvelInvites onJoined={() => setRefreshKey((k) => k + 1)} />
      </div>
      <NearbyStokvels />
      <Stokvels key={refreshKey} {...props} />
      {tourStokvelId && <StokvelWelcomeTour stokvelId={tourStokvelId} onClose={closeTour} />}
    </>
  )
}
