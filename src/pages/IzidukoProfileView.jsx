import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import Icon from '../components/Icon.jsx'
import { CEREMONY_IMAGE } from '../data/ceremonyImages.js'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'

// The full profile behind Iziduko's "View profile" button — only ever
// reachable for a mutually-accepted connection (the server enforces this
// too, with a 403; this screen just shows the honest result of that).
function IzidukoProfileView({ userId, onBack, onMessage }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setDenied(false)
    fetch(`/api/iziduko/connections/${userId}/profile`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const data = await res.json()
        if (res.status === 403) { setDenied(true); return }
        if (!res.ok) throw new Error(data.error || 'Could not load profile')
        setProfile(data)
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [userId, accessToken, showToast])

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <header className="relative overflow-hidden bg-[#1c1612] px-5 pb-8 pt-6 text-cream">
        <img src={CEREMONY_IMAGE.UMGIDI} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c1612]/40 via-[#1c1612]/55 to-[#1c1612]" />
        <div className="relative">
        <button onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold text-cream backdrop-blur-sm">← Back</button>
        <h1 className="font-display font-semibold text-[2rem] leading-[1.08]">Profile</h1>
      </div>
      </header>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-40 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : denied ? (
          <EmptyState
            emoji="🔒"
            title="Not connected"
            description="You can only view a full profile once you're both connected — send or accept a request first."
          />
        ) : !profile ? (
          <EmptyState emoji="🤷" title="Profile not found" description="This person's profile could not be loaded." />
        ) : (
          <>
            <div className="bg-white border-2 border-terracotta/25 rounded-soft overflow-hidden shadow-soft">
              <div className="relative aspect-square bg-sage-50">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt={`${profile.firstName} ${profile.lastName}`} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"><Icon name="user" size={48} color="#4a7a4a" /></div>
                )}
              </div>
              <div className="p-4">
                <p className="font-display font-bold text-2xl text-ink">{profile.firstName} {profile.lastName}</p>
                <div className="space-y-1.5 mt-3">
                  {profile.address && (
                    <p className="text-sm text-ink-muted flex items-center gap-1.5"><Icon name="mapPin" size={13} /> {profile.address}</p>
                  )}
                  {profile.phoneNumber && (
                    <p className="text-sm text-ink-muted flex items-center gap-1.5"><Icon name="phone" size={13} /> {profile.phoneNumber}</p>
                  )}
                  {profile.age && <p className="text-sm text-ink-muted">Age: <strong className="text-ink">{profile.age}</strong></p>}
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-terracotta/25 rounded-soft p-5 mt-4 shadow-elevated">
              <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider mb-3">Iziduko (Clan Lines)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-sage-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-sage-600 uppercase tracking-wider">Paternal</p>
                  <p className="font-bold text-ink">{profile.paternalIziduko || '—'}</p>
                </div>
                <div className="bg-cream rounded-2xl p-4 border-2 border-cream-dark">
                  <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Maternal</p>
                  <p className="font-bold text-ink">{profile.maternalIziduko || '—'}</p>
                </div>
                <div className="bg-sage-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-sage-600 uppercase tracking-wider">Paternal grandmother</p>
                  <p className="font-bold text-ink">{profile.paternalGrandmotherIziduko || '—'}</p>
                </div>
                <div className="bg-cream rounded-2xl p-4 border-2 border-cream-dark">
                  <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Maternal grandmother</p>
                  <p className="font-bold text-ink">{profile.maternalGrandmotherIziduko || '—'}</p>
                </div>
              </div>
            </div>

            {onMessage && (
              <button
                onClick={() => onMessage(profile.id)}
                className={`w-full text-sm font-bold text-white bg-terracotta py-3 rounded-pill flex items-center justify-center gap-1.5 mt-4 ${pressable}`}
              >
                <Icon name="send" size={15} color="#fff" /> Message {profile.firstName}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default IzidukoProfileView
