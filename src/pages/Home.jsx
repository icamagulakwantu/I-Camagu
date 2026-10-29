import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCommunity } from '../context/CommunityContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import PoolOfferCard from '../components/PoolOfferCard.jsx'
import DidYouKnow from '../components/DidYouKnow.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import PinReminder from '../components/PinReminder.jsx'
import BeadBand from '../components/ui/BeadBand.jsx'
import JourneyMap from '../components/home/JourneyMap.jsx'
import CommunityShortcuts from '../components/home/CommunityShortcuts.jsx'

// Step colours: sage = money saved, ochre = buying, terracotta = ceremony.
const SAGE = '#4a7a4a'
const OCHRE = '#c1922f'
const TERRACOTTA = '#c45c26'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const rand = (n) => `R${Number(n).toLocaleString('en-ZA')}`

function ceremonyProgress(ceremony) {
  const items = ceremony?.checklistItems || []
  if (!items.length) return null
  return Math.round((items.filter((i) => i.isCompleted || i.isChecked).length / items.length) * 100)
}

function daysUntil(dateValue) {
  if (!dateValue) return null
  const ms = new Date(dateValue).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  const days = Math.round(ms / 86400000)
  return days >= 0 ? days : null
}

function SectionHeading({ eyebrow, title, actionLabel, onAction }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <p className="eyebrow text-terracotta">{eyebrow}</p>
        <h2 className="font-display text-[1.4rem] font-semibold leading-tight text-ink">{title}</h2>
      </div>
      {actionLabel && (
        <button type="button" onClick={onAction} className="text-xs font-bold text-terracotta flex-shrink-0 pb-1">
          {actionLabel} →
        </button>
      )}
    </div>
  )
}

export default function Home({ onNavigate, basketCount = 0, onSelectCeremony }) {
  const { user, accessToken } = useAuth()
  const { feed, feedError, refreshPools, location } = useCommunity()
  const { showToast } = useToast()
  const [stokvels, setStokvels] = useState([])
  const [ceremonies, setCeremonies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    const headers = { Authorization: `Bearer ${accessToken}` }
    const load = (url, label) => fetch(url, { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Failed to load ${label}`))))
      .then((data) => (Array.isArray(data) ? data : []))
      .catch((err) => { showToast(err.message, 'error'); return [] })

    setLoading(true)
    Promise.all([load('/api/stokvels/my', 'stokvels'), load('/api/ceremonies/my', 'ceremonies')])
      .then(([stokvelData, ceremonyData]) => {
        setStokvels(stokvelData)
        setCeremonies(ceremonyData)
      })
      .finally(() => setLoading(false))
  }, [accessToken, showToast])

  const pools = feed.pools || []
  const totalSaved = stokvels.reduce((sum, s) => sum + (Number(s.totalBalance) || 0), 0)
  const leadCeremony = ceremonies[0] || null
  const progress = ceremonyProgress(leadCeremony)
  const countdown = daysUntil(leadCeremony?.eventDate)

  const steps = [
    {
      id: 'save',
      color: SAGE,
      xhosa: 'Yonga kunye · Save together',
      title: 'Save with your stokvel',
      status: stokvels.length
        ? `${plural(stokvels.length, 'stokvel')} · ${rand(totalSaved)} saved`
        : 'Start or join a stokvel with people you trust',
      action: stokvels.length ? 'Open' : 'Start',
      done: stokvels.length > 0,
      onOpen: () => onNavigate('stokvels'),
    },
    {
      id: 'buy',
      color: OCHRE,
      xhosa: 'Thengani kunye · Buy together',
      title: 'Buy in bulk, pay less',
      status: basketCount > 0
        ? `${plural(basketCount, 'item')} in your basket`
        : pools.length
          ? `${plural(pools.length, 'group order')} near you`
          : 'Group orders for drinks, meat & groceries',
      action: basketCount > 0 ? 'Basket' : 'Shop',
      done: basketCount > 0,
      onOpen: () => onNavigate(basketCount > 0 ? 'basket' : 'store'),
    },
    {
      id: 'celebrate',
      color: TERRACOTTA,
      xhosa: 'Lungiselela umsitho · Prepare',
      title: leadCeremony ? leadCeremony.title : 'Plan your ceremony',
      status: leadCeremony
        ? `${progress ?? 0}% prepared${countdown != null ? ` · ${countdown === 0 ? 'today' : `${plural(countdown, 'day')} to go`}` : ''}`
        : 'What tradition asks, what it costs, who brings what',
      progress: leadCeremony ? (progress ?? 0) : null,
      action: leadCeremony ? 'Continue' : 'Plan',
      done: progress === 100,
      onOpen: () => (leadCeremony?.id ? onSelectCeremony?.(leadCeremony.id) : onNavigate('ceremonyhub')),
    },
  ]

  return (
    <div className="px-5 pt-6 pb-28 max-w-md mx-auto">
      {/* Brand mark */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <img src="/icons/source/gateway-mark-1024.png" alt="" className="w-11 h-11" />
          <span className="font-display font-semibold text-[1.6rem] tracking-tight text-brand-black">iCamagu</span>
        </div>
        <NotificationBell onOpen={() => onNavigate('notifications')} />
      </div>

      {/* Hero: says what iCamagu is for. Not a button, so it never competes
          with the path below for the person's first tap. */}
      <section className="relative overflow-hidden rounded-[26px] mb-8 shadow-card">
        <img src="/images/home-hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1f1a15]/95 via-[#1f1a15]/55 to-[#1f1a15]/10" />
        <div className="relative px-5 pb-6 pt-20">
          <p className="eyebrow text-ochre-light">Molo, {user?.firstName || 'mhlobo'}</p>
          <h1 className="mt-2 font-display text-[1.85rem] font-semibold leading-[1.08] text-cream text-balance">
            Save together. Buy together. <em className="font-normal italic text-ochre-light">Honour tradition.</em>
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-cream/85">
            Your stokvel, bulk group orders and ceremony planning in one place, so you know what tradition asks and never overpay.
          </p>
        </div>
        <BeadBand className="relative" />
      </section>

      <JourneyMap steps={steps} loading={loading} />

      {feedError && (
        <div role="status" className="mb-8 card-paper p-4">
          <p className="text-sm font-bold text-ink">Group orders near you could not load.</p>
          <p className="text-xs text-ink-muted mt-1">Everything else still works. Try again in a moment.</p>
          <button type="button" onClick={() => refreshPools()} className="mt-3 min-h-11 rounded-full bg-terracotta px-4 text-sm font-bold text-white">Try again</button>
        </div>
      )}

      {pools.length > 0 && (
        <section className="mb-8" aria-label="Group orders near you">
          <SectionHeading
            eyebrow={location.label ? `Near ${location.label}` : 'Near you'}
            title="Group orders filling now"
            actionLabel="See all"
            onAction={() => onNavigate('store')}
          />
          <div className="space-y-3">
            {pools.slice(0, 2).map((pool) => (
              <PoolOfferCard key={pool.id} variant="feed" pool={pool} onOpen={() => onNavigate('store')} />
            ))}
          </div>
        </section>
      )}

      <CommunityShortcuts onNavigate={onNavigate} clanCeremonies={feed.upcomingClanCeremonies || []} />

      {/* The only legends block on Home. */}
      <section className="card-paper card-spine relative overflow-hidden p-5 pl-6 mb-6" aria-label="Did you know">
        <DidYouKnow />
        <button type="button" onClick={() => onNavigate('legends')} className="mt-3 text-xs font-bold text-terracotta">
          Explore the House of AmaXhosa →
        </button>
      </section>

      <PinReminder onNavigate={onNavigate} />
    </div>
  )
}
