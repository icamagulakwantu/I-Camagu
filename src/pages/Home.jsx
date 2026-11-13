import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCommunity } from '../context/CommunityContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import PoolOfferCard from '../components/PoolOfferCard.jsx'
import DidYouKnow from '../components/DidYouKnow.jsx'
import Icon from '../components/Icon.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { daysUntil, describeCountdown, nextCeremony } from '../lib/countdown.js'
import { ceremonyImage } from '../data/ceremonyImages.js'
import { labelForCeremonyType } from '../data/ceremonyLabels.js'

// Founder-supplied photo: women in umbhaco celebrating at an umgidi.
const HERO_IMAGE = 'https://hercules-cdn.com/file_wxyYBh6l6xbEhksr09BuCEsR'

// Layout idea: layered cards. The "Needs you" deck rises out of the hero
// photo, each ceremony's details rise out of its photo, and date tiles step
// out of their rows, so the page reads as one composed surface rather than a
// stack of separate boxes.

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const rand = (n) => `R${Math.round(Number(n) || 0).toLocaleString('en-ZA')}`

// The first unfinished, required step: what the host should do next.
function nextStep(ceremony) {
  const items = ceremony?.checklistItems || []
  return items.find((i) => !(i.isCompleted || i.isChecked) && !i.isOptional) || null
}

// One-tap starts for the ceremonies families plan most.
const QUICK_START = [
  { type: 'UMGIDI', label: 'Umgidi' },
  { type: 'WEDDING', label: 'Wedding' },
  { type: 'ULWALUKO', label: 'Ulwaluko' },
]

function checklistCounts(ceremony) {
  const items = ceremony?.checklistItems || []
  const done = items.filter((i) => i.isCompleted || i.isChecked).length
  return { done, total: items.length }
}

function shortDate(value, withYear = false) {
  if (!value) return ''
  const date = new Date(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    ...(withYear || !sameYear ? { year: 'numeric' } : {}),
  })
}

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1)

function initials(user) {
  return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'Me'
}

function Eyebrow({ children, tone = 'text-terracotta-dark' }) {
  return <p className={`text-xs font-extrabold uppercase tracking-[0.16em] ${tone}`}>{children}</p>
}

function SectionTitle({ eyebrow, title, actionLabel, onAction }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-5">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-0.5 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-ink">{title}</h2>
      </div>
      {actionLabel && (
        <button type="button" onClick={onAction} className="pressable flex-shrink-0 pb-1 text-sm font-extrabold text-terracotta-dark">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// ---------- Hero ----------

function Hero({ user, lead, unreadNotifications, onNavigate, onSelectCeremony, onOpenType }) {
  const days = daysUntil(lead?.eventDate)
  const { done, total } = checklistCounts(lead)
  const remaining = Math.max(total - done, 0)
  const progress = total ? Math.round((done / total) * 100) : 0
  const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const step = nextStep(lead)
  // Your own ceremony's photo when you have one; the umgidi photo otherwise.
  const photo = lead ? ceremonyImage(lead.type) : HERO_IMAGE

  return (
    <section className="relative h-[430px] overflow-hidden rounded-b-[36px] text-cream">
      <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_32%]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,15,11,0.6)_0%,rgba(20,15,11,0.25)_22%,rgba(20,15,11,0.7)_48%,rgba(20,15,11,0.96)_100%)]" />

      <header className="relative flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <img src="/images/brand/icon-128.png" alt="" width="34" height="34" className="h-[34px] w-[34px] rounded-[10px] ring-1 ring-cream/30" />
          <span className="font-display text-[1.4rem] font-semibold tracking-tight">i-Camagu</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} new` : 'Notifications'}
            className="pressable relative flex h-11 w-11 items-center justify-center rounded-full border border-cream/30 bg-black/30 backdrop-blur-sm"
          >
            <Icon name="bell" size={19} color="#fffdf9" />
            {unreadNotifications > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-ochre-light ring-2 ring-[#2a211a]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            aria-label="Your profile"
            className="pressable flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-ochre-light bg-terracotta-dark text-sm font-extrabold"
          >
            {user?.profileImage
              ? <img src={user.profileImage} alt="" className="h-full w-full object-cover" />
              : initials(user)}
          </button>
        </div>
      </header>

      {/* Bottom padding leaves room for the Needs-you deck that overlaps the hero. */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-[84px]">
        <Eyebrow tone="text-ochre-light">Molo, {user?.firstName || 'mhlobo'} · {today}</Eyebrow>
        {lead ? (
          <>
            <h1 className="mt-2 font-display text-[2.3rem] font-semibold leading-[1.02] tracking-tight text-balance">
              {lead.title}{' '}
              {days != null
                ? <>is <em className="font-medium text-ochre-light">{describeCountdown(days)}.</em></>
                : <em className="font-medium text-ochre-light">needs a date.</em>}
            </h1>
            <button
              type="button"
              onClick={() => (lead.id ? onSelectCeremony?.(lead.id) : onNavigate('ceremonyhub'))}
              className="pressable mt-3 flex w-full items-center gap-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-cream/85">
                  {lead.eventDate ? shortDate(lead.eventDate, true) : 'No date yet'}
                  {total > 0 && ` · ${remaining === 0 ? 'everything is ready' : `${plural(remaining, 'thing')} still to do`}`}
                </span>
                {step && (
                  <span className="mt-1 block truncate text-sm font-bold text-cream">
                    <span className="text-ochre-light">Next:</span> {step.label}
                  </span>
                )}
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-cream/25">
                  <span className="block h-full rounded-full bg-ochre-light" style={{ width: `${Math.max(progress, 3)}%` }} />
                </span>
              </span>
              <span className="flex h-11 flex-shrink-0 items-center gap-1.5 rounded-full bg-cream px-4 text-sm font-extrabold text-ink">
                Open <Icon name="arrowRight" size={15} />
              </span>
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-[2.3rem] font-semibold leading-[1.02] tracking-tight text-balance">
              What are we <em className="font-medium text-ochre-light">celebrating?</em>
            </h1>
            <p className="mt-2 text-sm text-cream/85">Pick a ceremony and get its plan: steps, roles, timeline and budget.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_START.map((q) => (
                <button
                  key={q.type}
                  type="button"
                  onClick={() => (onOpenType ? onOpenType(q.type) : onNavigate('ceremonyhub'))}
                  className="pressable flex h-11 items-center rounded-full bg-cream px-4 text-sm font-extrabold text-ink"
                >
                  {q.label}
                </button>
              ))}
              <button type="button" onClick={() => onNavigate('ceremonyhub')} className="pressable flex h-11 items-center gap-1.5 rounded-full border border-cream/40 px-4 text-sm font-extrabold text-cream">
                Other <Icon name="arrowRight" size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

// ---------- Needs you: a layered deck rising out of the hero ----------

function NeedsYou({ items, loading }) {
  const shown = items.slice(0, 3)
  const extra = items.length - shown.length

  return (
    <section aria-label="Needs you" className="relative z-10 mx-4 -mt-[64px]">
      {/* Two offset sheets behind the deck: the cards still waiting. */}
      {items.length > 1 && <span aria-hidden="true" className="absolute inset-x-6 -bottom-3 h-10 rounded-[22px] bg-[#e8dccb]" />}
      {items.length > 0 && <span aria-hidden="true" className="absolute inset-x-3 -bottom-1.5 h-10 rounded-[22px] bg-[#f1e7d8]" />}

      <div className="relative overflow-hidden rounded-[24px] bg-[#fffdf9] shadow-[0_24px_48px_-28px_rgba(43,30,18,0.65)]">
        <div className="flex items-center justify-between gap-3 border-b border-ink/[0.06] px-4 py-3">
          <Eyebrow>Needs you</Eyebrow>
          {!loading && items.length > 0 && (
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-extrabold text-cream">{items.length}</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 px-4 py-4">
            <Skeleton className="h-4 w-3/4 rounded-pill" />
            <Skeleton className="h-4 w-1/2 rounded-pill" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] bg-sage-100 text-sage-600">
              <Icon name="check" size={17} strokeWidth={2.4} />
            </span>
            <p className="text-sm font-bold text-ink">You are all caught up. Nothing is waiting for you.</p>
          </div>
        ) : (
          <ul>
            {shown.map((item) => (
              <li key={item.id} className="border-b border-ink/[0.06] last:border-b-0">
                <div className="flex items-center">
                  <button type="button" onClick={item.onOpen} className="pressable flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left">
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] ${item.tile}`}>
                      <Icon name={item.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-extrabold text-ink">{item.title}</span>
                      <span className="block truncate text-[13px] text-ink-muted">{item.detail}</span>
                    </span>
                    <Icon name="arrowRight" size={15} color="#6b645a" />
                  </button>
                  {item.onDismiss && (
                    <button type="button" onClick={item.onDismiss} aria-label={`Dismiss: ${item.title}`} className="pressable mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center text-ink-muted">
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {extra > 0 && <p className="border-t border-ink/[0.06] px-4 py-2.5 text-xs font-bold text-ink-muted">and {extra} more in your notifications</p>}
      </div>
    </section>
  )
}

// ---------- Your ceremonies: details rise out of each photo ----------

function CeremonyCard({ ceremony, onOpen }) {
  const days = daysUntil(ceremony.eventDate)
  const { done, total } = checklistCounts(ceremony)
  const progress = total ? Math.round((done / total) * 100) : 0
  const soon = days != null && days <= 14

  return (
    <li className="w-[208px] flex-shrink-0">
      <button type="button" onClick={onOpen} className="pressable block w-full text-left">
        <span className="relative block h-[132px] overflow-hidden rounded-[22px] bg-cream-dark">
          <img src={ceremonyImage(ceremony.type)} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className={`absolute left-0 top-3 rounded-r-full py-1 pl-3 pr-3 text-xs font-extrabold ${soon ? 'bg-terracotta-dark text-white' : 'bg-ink/80 text-cream'}`}>
            {days != null ? capitalise(describeCountdown(days)) : 'No date yet'}
          </span>
        </span>
        <span className="relative mx-2.5 -mt-8 block rounded-[18px] bg-[#fffdf9] px-3.5 pb-3 pt-3 shadow-[0_16px_30px_-20px_rgba(43,30,18,0.6)]">
          <span className="block truncate text-xs font-extrabold uppercase tracking-[0.12em] text-ink-muted">
            {labelForCeremonyType(ceremony.type)}{ceremony.eventDate ? ` · ${shortDate(ceremony.eventDate)}` : ''}
          </span>
          <span className="mt-0.5 block truncate font-display text-[1.15rem] font-semibold leading-tight text-ink">{ceremony.title}</span>
          <span className="mt-2 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-cream-dark">
              <span className="block h-full rounded-full bg-terracotta-dark" style={{ width: `${Math.max(progress, 3)}%` }} />
            </span>
            <span className="text-xs font-bold tabular-nums text-ink-muted">{total ? `${done}/${total}` : '—'}</span>
          </span>
        </span>
      </button>
    </li>
  )
}

function CeremonyRail({ ceremonies, loading, onSelectCeremony, onNavigate }) {
  return (
    <section aria-label="Your ceremonies" className="mt-12">
      <SectionTitle eyebrow="Imisebenzi yakho" title="Your ceremonies" actionLabel={ceremonies.length ? 'See all' : null} onAction={() => onNavigate('ceremonyhub')} />
      <ul className="flex snap-x gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading && [0, 1].map((i) => (
          <li key={i} className="w-[208px] flex-shrink-0"><Skeleton className="h-[200px] w-full rounded-[22px]" /></li>
        ))}
        {!loading && ceremonies.map((ceremony) => (
          <CeremonyCard key={ceremony.id} ceremony={ceremony} onOpen={() => onSelectCeremony?.(ceremony.id)} />
        ))}
        {!loading && (
          <li className="w-[150px] flex-shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('ceremonyhub')}
              className="pressable flex h-[200px] w-full flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-ink/15 text-center"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-terracotta-dark text-2xl font-light leading-none text-white">+</span>
              <span className="px-3 text-sm font-extrabold text-ink">Plan a ceremony</span>
            </button>
          </li>
        )}
      </ul>
    </section>
  )
}

// ---------- Clan: dark panel, date tiles step out of their rows ----------

function ClanPanel({ user, clanCeremonies, onNavigate }) {
  const clan = user?.paternalIziduko
  return (
    <section aria-label="Your clan" className="relative mx-4 mt-10 overflow-hidden rounded-[28px] bg-[#1f3320] text-cream">
      <div className="px-5 pb-5 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow tone="text-ochre-light">Abantu bakho{clan ? ` · ${clan}` : ''}</Eyebrow>
            <h2 className="mt-0.5 font-display text-[1.35rem] font-semibold leading-tight">
              {clanCeremonies.length ? 'Coming up in your clan' : 'Your clan'}
            </h2>
          </div>
          <button type="button" onClick={() => onNavigate('clangroups')} className="pressable flex-shrink-0 pb-0.5 text-sm font-extrabold text-ochre-light">
            Groups
          </button>
        </div>

        {clanCeremonies.length > 0 ? (
          <ul className="mt-4 space-y-2.5 pl-3">
            {clanCeremonies.slice(0, 3).map((ceremony) => {
              const date = ceremony.eventDate ? new Date(ceremony.eventDate) : null
              const days = daysUntil(ceremony.eventDate)
              return (
                <li key={ceremony.id} className="relative flex items-center gap-3 rounded-[18px] bg-[#2a211a] py-3 pl-12 pr-4">
                  {/* The date tile steps out past the row's left edge. */}
                  <span className="absolute -left-3 top-1/2 flex h-[52px] w-[48px] -translate-y-1/2 flex-col items-center justify-center rounded-[14px] bg-terracotta-dark leading-none shadow-[0_10px_20px_-10px_rgba(0,0,0,0.7)]">
                    {date ? (
                      <>
                        <span className="font-display text-xl font-semibold">{date.getDate()}</span>
                        <span className="mt-0.5 text-xs font-extrabold uppercase tracking-wider">{date.toLocaleDateString('en-ZA', { month: 'short' })}</span>
                      </>
                    ) : <Icon name="calendar" size={18} color="#fffdf9" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[1.05rem] font-semibold">{ceremony.title}</span>
                    <span className="block truncate text-[13px] text-[#c9bfb2]">
                      Hosted by {ceremony.host?.firstName || 'a clan member'}{days != null ? ` · ${describeCountdown(days)}` : ' · date to be confirmed'}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-[#c9bfb2]">When someone in your clan plans a ceremony, it appears here.</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => onNavigate('iziduko')} className="pressable flex h-11 items-center justify-center gap-2 rounded-full bg-ochre-light text-sm font-extrabold text-[#1c1612]">
            <Icon name="link" size={15} /> Find your clan
          </button>
          <button type="button" onClick={() => onNavigate('legends')} className="pressable flex h-11 items-center justify-center gap-2 rounded-full border border-cream/30 text-sm font-bold text-cream">
            <Icon name="landmark" size={15} /> AmaXhosa
          </button>
        </div>
      </div>
    </section>
  )
}

// ---------- Save and buy together: icon discs break out of the tiles ----------

function MoneyTiles({ stokvels, totalSaved, pools, basketCount, onNavigate }) {
  const tiles = [
    {
      id: 'stokvels',
      bg: 'bg-[#2e4a2e]', disc: 'bg-[#b9d3b0] text-[#1f3320]', icon: 'coins',
      title: 'Stokvels',
      detail: stokvels.length ? `${plural(stokvels.length, 'stokvel')} · ${rand(totalSaved)} saved` : 'Start one, or join with an invite link',
      action: stokvels.length ? 'Open' : 'Start',
      onOpen: () => onNavigate('stokvels'),
    },
    {
      id: 'store',
      bg: 'bg-[#a3471a]', disc: 'bg-[#fffdf9] text-[#a3471a]', icon: 'cart',
      title: 'Bulk Buy',
      detail: basketCount > 0
        ? `${plural(basketCount, 'item')} in your basket`
        : pools.length ? `${plural(pools.length, 'group order')} near you` : 'Drinks, meat and groceries at bulk prices',
      action: basketCount > 0 ? 'Basket' : 'Shop',
      onOpen: () => onNavigate(basketCount > 0 ? 'basket' : 'store'),
    },
  ]

  return (
    <section aria-label="Save and buy together" className="mt-12">
      <SectionTitle eyebrow="Yonga · Thenga kunye" title="Save and buy together" />
      <div className="grid grid-cols-2 gap-3 px-5 pt-3">
        {tiles.map((tile) => (
          <button key={tile.id} type="button" onClick={tile.onOpen} className={`pressable relative flex min-h-[132px] flex-col justify-end rounded-[22px] ${tile.bg} px-4 pb-3.5 pt-8 text-left text-cream`}>
            {/* The icon disc sits half outside the tile's top edge. */}
            <span className={`absolute -top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full ${tile.disc} ring-4 ring-cream`}>
              <Icon name={tile.icon} size={19} />
            </span>
            <span className="font-display text-[1.2rem] font-semibold leading-tight">{tile.title}</span>
            <span className="mt-1 text-[13px] leading-snug text-cream/85">{tile.detail}</span>
            <span className="mt-2 text-sm font-extrabold">{tile.action} →</span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ---------- Home ----------

export default function Home({ onNavigate, basketCount = 0, pendingApprovals = 0, unreadNotifications = 0, onSelectCeremony, onOpenType }) {
  const { user, accessToken } = useAuth()
  const { feed, feedError, refreshPools, location } = useCommunity()
  const { showToast } = useToast()
  const [stokvels, setStokvels] = useState([])
  const [ceremonies, setCeremonies] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasPinSet, setHasPinSet] = useState(true)

  const pinDismissKey = user?.id ? `icamagu_pin_reminder_dismissed:${user.id}` : null
  const [pinDismissed, setPinDismissed] = useState(() => {
    try { return Boolean(pinDismissKey && localStorage.getItem(pinDismissKey)) } catch { return false }
  })

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

    fetch('/api/user/pin/status', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setHasPinSet(Boolean(data.hasPinSet)) })
      .catch(() => {})
  }, [accessToken, showToast])

  const pools = feed.pools || []
  const totalSaved = stokvels.reduce((sum, s) => sum + (Number(s.totalBalance) || 0), 0)
  const lead = nextCeremony(ceremonies)
  // Soonest first, so the rail reads like a calendar.
  const orderedCeremonies = [...ceremonies].sort((a, b) => {
    const da = daysUntil(a.eventDate); const db = daysUntil(b.eventDate)
    return (da ?? Infinity) - (db ?? Infinity)
  })

  // One list of what is waiting for this person, across the whole app.
  const needs = []
  if (pendingApprovals > 0) {
    needs.push({ id: 'approvals', icon: 'shieldCheck', tile: 'bg-sage-100 text-sage-700', title: `${plural(pendingApprovals, 'approval')} waiting`, detail: 'Your stokvel needs your decision', onOpen: () => onNavigate('stokvels') })
  }
  if (!hasPinSet && !pinDismissed) {
    needs.push({
      id: 'pin', icon: 'key', tile: 'bg-[#1f3320] text-ochre-light', title: 'Set your security PIN', detail: 'Needed to approve payouts and confirm contributions',
      onOpen: () => onNavigate('pin'),
      onDismiss: () => {
        try { if (pinDismissKey) localStorage.setItem(pinDismissKey, '1') } catch { /* storage unavailable */ }
        setPinDismissed(true)
      },
    })
  }
  if (basketCount > 0) {
    needs.push({ id: 'basket', icon: 'cart', tile: 'bg-[#f3e6cf] text-[#a3471a]', title: 'Finish your order', detail: `${plural(basketCount, 'item')} waiting in your basket`, onOpen: () => onNavigate('basket') })
  }
  if (lead && !lead.eventDate) {
    needs.push({ id: 'date', icon: 'calendar', tile: 'bg-[#f6e2d6] text-terracotta-dark', title: `Give ${lead.title} a date`, detail: 'Family can plan around it once it has one', onOpen: () => onSelectCeremony?.(lead.id) })
  }
  if (unreadNotifications > 0) {
    needs.push({ id: 'notifications', icon: 'bell', tile: 'bg-cream-dark text-ink', title: `${plural(unreadNotifications, 'new notification')}`, detail: 'Pledges, orders and messages', onOpen: () => onNavigate('notifications') })
  }

  return (
    <div className="mx-auto max-w-md pb-32">
      <Hero user={user} lead={lead} unreadNotifications={unreadNotifications} onNavigate={onNavigate} onSelectCeremony={onSelectCeremony} onOpenType={onOpenType} />

      <NeedsYou items={needs} loading={loading} />

      {/* With no ceremony yet the hero already asks what you are planning, so
          the rail would only repeat it. */}
      {(loading || ceremonies.length > 0) && (
        <CeremonyRail ceremonies={orderedCeremonies} loading={loading} onSelectCeremony={onSelectCeremony} onNavigate={onNavigate} />
      )}

      {/* Your clan is the foundation of who you are, so it comes before money. */}
      <ClanPanel user={user} clanCeremonies={feed.upcomingClanCeremonies || []} onNavigate={onNavigate} />

      <MoneyTiles stokvels={stokvels} totalSaved={totalSaved} pools={pools} basketCount={basketCount} onNavigate={onNavigate} />

      {feedError && (
        <div role="status" className="mx-5 mt-6 rounded-[20px] bg-[#fffdf9] p-4 shadow-soft">
          <p className="text-sm font-bold text-ink">Group orders near you could not load.</p>
          <p className="mt-1 text-xs text-ink-muted">Everything else still works. Try again in a moment.</p>
          <button type="button" onClick={() => refreshPools()} className="mt-3 min-h-11 rounded-full bg-terracotta-dark px-4 text-sm font-bold text-white">Try again</button>
        </div>
      )}

      {pools.length > 0 && (
        <section aria-label="Group orders near you" className="mt-10">
          <SectionTitle
            eyebrow={location.label ? `Near ${location.label}` : 'Near you'}
            title="Group orders filling now"
            actionLabel="See all"
            onAction={() => onNavigate('store')}
          />
          <div className="px-5">
            <PoolOfferCard variant="feed" pool={pools[0]} onOpen={() => onNavigate('store')} />
          </div>
        </section>
      )}

      {/* Culture: a card with a folder tab standing up from its top edge. */}
      <section aria-label="Did you know" className="mx-4 mt-14">
        <span className="relative z-10 ml-5 inline-flex items-center gap-2 rounded-t-[14px] bg-[#1f3320] px-4 pb-2 pt-2 text-xs font-extrabold uppercase tracking-[0.16em] text-ochre-light">
          <Icon name="landmark" size={13} /> Inkcubeko
        </span>
        <div className="relative overflow-hidden rounded-[24px] rounded-tl-[8px] bg-[#fffdf9] p-5 shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
          <DidYouKnow />
          <button type="button" onClick={() => onNavigate('legends')} className="pressable mt-3 text-sm font-extrabold text-terracotta-dark">
            Explore the House of AmaXhosa →
          </button>
        </div>
      </section>

      {/* The Shrine Fund: the nation-building purpose behind everything above. */}
      <button
        type="button"
        onClick={() => onNavigate('shrinefund')}
        className="pressable relative mx-4 mt-8 block w-[calc(100%-2rem)] overflow-hidden rounded-[24px] bg-terracotta-dark p-5 text-left text-cream"
      >
        <span aria-hidden="true" className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-ochre-light/20" />
        <span className="relative block text-[11px] font-extrabold uppercase tracking-[0.18em] text-ochre-light">Ubuhlanti · Shrine Fund</span>
        <span className="relative mt-1 block font-display text-[1.3rem] font-semibold leading-tight">Together we build greatness.</span>
        <span className="relative mt-1 block text-[13px] text-cream/85">Our own seed capital, owned by the community. Pledge from R1 →</span>
      </button>

      <p className="mt-10 text-center font-display text-sm italic text-ink-muted">Umntu ngumntu ngabantu</p>
    </div>
  )
}
