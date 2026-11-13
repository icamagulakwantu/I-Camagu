import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import Icon from '../components/Icon.jsx'
import AncestralRites from './AncestralRites.jsx'
import { CEREMONY_IMAGE } from '../data/ceremonyImages.js'

// One colour per kind of thing, matching Home:
// terracotta = ceremony, sage = family & culture, ochre = money & services.
// Each group is a coloured panel with its tools rising out of it as cards.
// Nothing that already has its own bottom tab is repeated here. Every tile
// carries a short line saying what it is for, so nobody has to guess.
const TILE_GROUPS = [
  {
    title: 'Imisebenzi',
    english: 'Ceremony tools',
    line: 'Everything to run the day the way it should be run.',
    color: '#a3471a',
    items: [
      { id: 'templates', icon: 'template', label: 'Ceremony templates', desc: 'Ready-made plans to start from' },
      { id: 'hierarchy', icon: 'users', label: 'Who brings what', desc: 'Give each group its items' },
      // Family pledges for a ceremony live on the ceremony page. This is the
      // separate record of gifts exchanged between families over the years.
      { id: 'ukugida', icon: 'send', label: 'Ukugida', desc: 'Gifts guests bring, and what you return', keywords: 'gift exchange reciprocity return gifts bottle case' },
      { id: 'umqombothi', icon: 'beer', label: 'Umqombothi brewing', desc: 'Steps and quantities', keywords: 'beer brew traditional' },
      { id: 'ukusoka', icon: 'gift', label: 'Ukusoka', desc: 'Preparing with the ingcibi', keywords: 'circumcision initiation' },
      { id: 'rites', icon: 'footprints', label: 'Ancestral rites', desc: 'Each step and its meaning', keywords: 'ancestors amasiko' },
    ],
  },
  {
    title: 'Usapho & Inkcubeko',
    english: 'Family & culture',
    line: 'Your clan, your history, your people.',
    color: '#2e4a2e',
    items: [
      { id: 'iziduko', icon: 'link', label: 'Find clan members', desc: 'Siblings and clan by iziduko', keywords: 'clanmatch family' },
      { id: 'clangroups', icon: 'users', label: 'Clan groups', desc: 'Talk and plan with your clan' },
      { id: 'legends', icon: 'landmark', label: 'House of AmaXhosa', desc: 'History, kings and legends', keywords: 'did you know heritage' },
      { id: 'portal', icon: 'image', label: 'Family archive', desc: 'Photos and family records' },
    ],
  },
  {
    title: 'Imali & Iinkonzo',
    english: 'Money & services',
    line: 'Orders, spending and the people who serve our ceremonies.',
    color: '#a3471a',
    items: [
      { id: 'myorders', icon: 'package', label: 'My orders', desc: 'Track your bulk orders', keywords: 'delivery' },
      { id: 'expenditure', icon: 'coins', label: 'My spending', desc: 'Where the money went', keywords: 'budget' },
      { id: 'directory', icon: 'book', label: 'Healers, ingcibi & vendors', desc: 'Trusted traditional help', keywords: 'igqirha sangoma merchant' },
      { id: 'ekoyini', icon: 'cocktail', label: 'Ekoyini mobile bar', desc: 'Book a bar for your event' },
      { id: 'supplier', icon: 'store', label: 'Sell on iCamagu', desc: 'Supply stokvels and families', keywords: 'supplier producer' },
    ],
  },
]

// The Shrine Fund gets its own banner: it is the nation-building heart of
// the app, not one tool among many.
const FUND_ITEM = { id: 'ubuhlanti', icon: 'flame', label: 'Ubuhlanti Shrine Fund', desc: 'Together we build greatness', keywords: 'shrine fund donate pledge', color: '#a3471a' }

const LIST_GROUPS = [
  {
    title: 'Iakhawunti yam',
    english: 'My account',
    items: [
      { id: 'profile', icon: 'user', label: 'Profile', desc: 'Name, area and iziduko' },
      { id: 'activity', icon: 'activity', label: 'My activity', desc: 'Everything you have done lately' },
      { id: 'pin', icon: 'key', label: 'Security PIN', desc: 'Protects payouts and approvals' },
      { id: 'account', icon: 'lock', label: 'Account & privacy', desc: 'Password, data and deletion' },
      { id: 'help', icon: 'help', label: 'Help', desc: 'Answers and support' },
      { id: 'privacy', icon: 'file', label: 'Privacy policy', desc: 'How we look after your data' },
    ],
  },
  {
    title: 'Admin tools',
    adminOnly: true,
    items: [
      { id: 'demandadmin', icon: 'coins', label: 'Group orders & offers' },
      { id: 'ekoyiniadmin', icon: 'settings', label: 'Ekoyini admin' },
      { id: 'identityadmin', icon: 'key', label: 'Identity admin' },
      { id: 'marginadmin', icon: 'chart', label: 'Cost & margin' },
    ],
  },
]

const RECENT_KEY = 'icamagu_more_recent'
const MUTED = '#6b645a'

function readRecent() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function GroupHeading({ title, english, color = '#2b2620' }) {
  return (
    <div className="mb-3 flex items-center gap-2 px-0.5">
      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <h2 className="font-display text-lg font-semibold leading-none text-ink">{title}</h2>
      {english && <span className="text-xs text-ink-muted">{english}</span>}
      <span className="h-px flex-1 bg-ink/10" />
    </div>
  )
}

function ItemRow({ item, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cream/70 active:bg-cream-dark/60"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${item.color || MUTED}1a` }}>
        <Icon name={item.icon} size={17} color={item.color || MUTED} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{item.label}</span>
        {item.desc && <span className="block truncate text-xs text-ink-muted">{item.desc}</span>}
      </span>
      <Icon name="arrowRight" size={14} color={MUTED} />
    </button>
  )
}

export default function More({ onNavigate }) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [showRites, setShowRites] = useState(false)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState(readRecent)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const isAdmin = Boolean(user?.isAdmin)
  const listGroups = useMemo(() => LIST_GROUPS.filter((g) => !g.adminOnly || isAdmin), [isAdmin])
  const allItems = useMemo(() => [
    ...TILE_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, color: g.color }))),
    FUND_ITEM,
    ...listGroups.flatMap((g) => g.items),
  ], [listGroups])

  const q = query.trim().toLowerCase()
  const results = q
    ? allItems.filter((i) => `${i.label} ${i.desc || ''} ${i.keywords || ''}`.toLowerCase().includes(q))
    : []
  const recentItems = recent.map((id) => allItems.find((i) => i.id === id)).filter(Boolean)

  // Remembers the last few tools used, so the things a person comes back
  // for (pledges, brewing, orders) are one tap away at the top.
  const handleNav = (id) => {
    const next = [id, ...recent.filter((x) => x !== id)].slice(0, 4)
    setRecent(next)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* storage full or blocked */ }
    if (id === 'rites') { setShowRites(true); window.scrollTo(0, 0); return }
    const screen = id === 'ubuhlanti' ? 'shrinefund' : id
    if (typeof onNavigate === 'function') onNavigate(screen)
  }

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Logged out successfully', 'info')
    } catch {
      showToast('Failed to log out', 'error')
    }
  }

  if (showRites) {
    return (
      <AncestralRites
        onBack={() => setShowRites(false)}
        onOpenUbuhlanti={() => handleNav('ubuhlanti')}
        onOpenProfile={() => handleNav('profile')}
      />
    )
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  const initials = [user?.firstName, user?.lastName].filter(Boolean).map((n) => n[0]).join('').toUpperCase()

  return (
    <div className="mx-auto min-h-screen max-w-md bg-cream pb-28">
      {/* Hero: who you are, on a ceremony photo. The search rises out of it. */}
      <header className="relative overflow-hidden bg-[#1f3320] px-5 pb-16 pt-7 text-cream">
        <img src={CEREMONY_IMAGE.UMGIDI} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1f3320]/40 to-[#1f3320]" />
        <div className="relative">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-ochre-light">Konke okunye · Everything else</p>
          <h1 className="mt-1 font-display text-[2rem] font-semibold leading-tight">Your whole iCamagu</h1>
          {user && (
            <button
              type="button"
              onClick={() => handleNav('profile')}
              className="pressable mt-5 flex w-full items-center gap-3.5 rounded-[22px] border border-cream/15 bg-white/[0.08] p-3 text-left backdrop-blur-sm"
            >
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-terracotta-dark ring-2 ring-ochre-light/70">
                {user.profileImage
                  ? <img src={user.profileImage} alt="" className="h-full w-full object-cover" />
                  : <span className="font-display text-xl font-semibold text-cream">{initials || <Icon name="user" size={22} color="#fffdf9" />}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-lg font-semibold text-cream">{fullName || 'Your profile'}</span>
                <span className="mt-0.5 block truncate text-xs text-cream/80">
                  {user.paternalIziduko ? `Clan · ${user.paternalIziduko}` : 'Add your iziduko so your clan can find you'}
                </span>
              </span>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cream/10">
                <Icon name="arrowRight" size={16} color="#fffdf9" />
              </span>
            </button>
          )}
        </div>
      </header>

      <div className="relative z-10 -mt-7 px-5">
        <label className="relative block">
          <span className="sr-only">Search tools</span>
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <Icon name="search" size={17} color={MUTED} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, e.g. umqombothi, clan, orders"
            className="h-14 w-full rounded-[20px] border border-ink/[0.06] bg-white pl-11 pr-11 text-[15px] shadow-[0_16px_36px_-18px_rgba(28,22,18,0.45)] focus:border-terracotta focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute inset-y-0 right-1.5 flex w-10 items-center justify-center"
            >
              <Icon name="close" size={16} color={MUTED} />
            </button>
          )}
        </label>
      </div>

      <div className="px-5 pt-6">
      {q ? (
        <section className="mb-6" aria-live="polite">
          <GroupHeading title="Iziphumo" english={`${results.length} result${results.length === 1 ? '' : 's'}`} />
          {results.length > 0 ? (
            <div className="card-paper divide-y divide-ink/[0.06] overflow-hidden">
              {results.map((item) => <ItemRow key={item.id} item={item} onOpen={handleNav} />)}
            </div>
          ) : (
            <div className="card-paper p-5 text-center">
              <p className="text-sm font-bold text-ink">Nothing matches "{query.trim()}"</p>
              <p className="mt-1 text-xs text-ink-muted">Try another word, like "clan", "budget" or "healer".</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {recentItems.length > 0 && (
            <section className="mb-7">
              <p className="eyebrow mb-2.5 px-0.5">Kutshanje · Recently used</p>
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                {recentItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className="pressable flex flex-shrink-0 items-center gap-2 rounded-pill border border-ink/[0.08] bg-white py-2 pl-2 pr-3.5 shadow-soft"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: item.color || MUTED }}>
                      <Icon name={item.icon} size={14} color="#ffffff" />
                    </span>
                    <span className="whitespace-nowrap text-xs font-bold text-ink">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* The Shrine Fund: the nation-building heart of the app. */}
          <button
            type="button"
            onClick={() => handleNav(FUND_ITEM.id)}
            className="pressable relative mb-8 block w-full overflow-hidden rounded-[26px] bg-[#1f3320] p-5 text-left text-cream shadow-[0_22px_44px_-24px_rgba(28,22,18,0.85)]"
          >
            <span aria-hidden="true" className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-ochre-light/15" />
            <span aria-hidden="true" className="absolute -bottom-14 right-10 h-28 w-28 rounded-full bg-terracotta-dark/40" />
            <span className="relative flex items-start gap-3.5">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-ochre-light">
                <Icon name="flame" size={22} color="#1c1612" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-ochre-light">Ubuhlanti · Shrine Fund</span>
                <span className="mt-1 block font-display text-[1.35rem] font-semibold leading-tight">Together we build greatness.</span>
                <span className="mt-1.5 block text-[13px] leading-snug text-cream/80">Our own seed capital, owned by the community. Pledge from R1.</span>
              </span>
            </span>
          </button>

          {TILE_GROUPS.map((group) => (
            <section key={group.title} className="mb-8 rounded-[28px] p-3 pb-3.5" style={{ backgroundColor: group.color }}>
              <div className="px-2 pb-4 pt-2 text-cream">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-cream/70">{group.english}</p>
                <h2 className="mt-0.5 font-display text-[1.45rem] font-semibold leading-tight">{group.title}</h2>
                <p className="mt-0.5 text-[13px] text-cream/80">{group.line}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 pt-3">
                {group.items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className={`pressable relative rounded-[20px] bg-cream px-3.5 pb-3.5 pt-8 text-left shadow-[0_12px_24px_-16px_rgba(0,0,0,0.6)] ${group.items.length % 2 === 1 && i === group.items.length - 1 ? 'col-span-2' : ''}`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -top-4 left-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white"
                      style={{ boxShadow: `0 0 0 4px ${group.color}` }}
                    >
                      <Icon name={item.icon} size={20} color={group.color} />
                    </span>
                    <span className="block text-[14px] font-bold leading-tight text-ink">{item.label}</span>
                    <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-ink-muted">{item.desc}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {listGroups.map((group) => (
            <section key={group.title} className="mb-7">
              <GroupHeading title={group.title} english={group.english} />
              <div className="card-paper divide-y divide-ink/[0.06] overflow-hidden">
                {group.items.map((item) => <ItemRow key={item.id} item={item} onOpen={handleNav} />)}
              </div>
            </section>
          ))}
        </>
      )}

      {/* Asks first: a stray tap on Log out is easy on a phone. */}
      {confirmLogout ? (
        <div className="card-paper mb-8 p-4">
          <p className="text-sm font-bold text-ink">Log out of iCamagu?</p>
          <p className="mt-0.5 text-xs text-ink-muted">Your stokvels and plans stay safe. You can sign back in any time.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={handleLogout} className="pressable flex-1 rounded-pill bg-terracotta py-2.5 text-sm font-bold text-white">
              Yes, log out
            </button>
            <button type="button" onClick={() => setConfirmLogout(false)} className="pressable flex-1 rounded-pill bg-cream-dark py-2.5 text-sm font-bold text-ink">
              Stay
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="pressable mb-8 flex w-full items-center justify-center gap-2 rounded-pill py-3 text-sm font-bold text-terracotta transition-colors hover:bg-terracotta/10"
        >
          <Icon name="logout" size={16} color="#c45c26" /> Phuma · Log out
        </button>
      )}

      <footer className="flex flex-col items-center pb-4 text-center">
        <img src="/images/brand/wordmark.png" alt="i-Camagu" loading="lazy" className="mb-3 h-9 w-auto opacity-90" />
        <p className="font-display text-base italic text-ink">Umntu ngumntu ngabantu</p>
        <p className="mt-1 text-xs text-ink-muted">A person is a person through other people.</p>
      </footer>
      </div>
    </div>
  )
}
