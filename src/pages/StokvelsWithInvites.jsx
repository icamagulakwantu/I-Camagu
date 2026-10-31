import { useCallback, useEffect, useState } from 'react'
import Stokvels from './Stokvels.jsx'
import MyStokvelInvites from '../components/MyStokvelInvites.jsx'
import NearbyStokvels from '../components/NearbyStokvels.jsx'
import ProfileCompletionCard from '../components/ProfileCompletionCard.jsx'
import StokvelWelcomeTour from '../components/StokvelWelcomeTour.jsx'
import StokvelPoolFundingRequests from '../components/StokvelPoolFundingRequests.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCommunity } from '../context/CommunityContext.jsx'

const seenKey = (userId, stokvelId) => `icamagu_tour_seen:${userId}:${stokvelId}`
const baselineKey = (userId) => `icamagu_tour_baseline:${userId}`

// The Stokvels screen with extras on top: invitations waiting for the person,
// a "complete your profile" card, a "find stokvels near you" bar, and a
// one-time welcome tour for any stokvel they have just joined.
export default function StokvelsWithInvites(props) {
  const { accessToken, user } = useAuth()
  const { location } = useCommunity()
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

  // Things that need an answer (invitations, funding approvals) go right under
  // the header. Discovery and profile prompts go after the person's own
  // stokvels, so the screen opens with its title like every other tab.
  const topSlot = (
    <>
      <MyStokvelInvites onJoined={() => setRefreshKey((k) => k + 1)} />
      <StokvelPoolFundingRequests />
    </>
  )

  const bottomSlot = (
    <>
      <NearbyStokvels />

      <ProfileCompletionCard />
    </>
  )

  return (
    <>
      <Stokvels key={refreshKey} {...props} topSlot={topSlot} bottomSlot={bottomSlot} />
      {tourStokvelId && <StokvelWelcomeTour stokvelId={tourStokvelId} onClose={closeTour} />}
    </>
  )
}
