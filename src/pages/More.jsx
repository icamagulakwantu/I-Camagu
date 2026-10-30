import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import AncestralRites from './AncestralRites.jsx'

// One colour per kind of thing, matching Home:
// terracotta = ceremony, sage = family & culture, ochre = money & services.
// Nothing that already has its own bottom tab is repeated here. Every tile
// carries a short line saying what it is for, so nobody has to guess.
const TILE_GROUPS = [
  {
    title: 'Imisebenzi',
    english: 'Ceremony tools',
    color: '#c45c26',
    items: [
      { id: 'templates', icon: 'template', label: 'Ceremony templates', desc: 'Ready-made plans to start from' },
      { id: 'hierarchy', icon: 'users', label: 'Who brings what', desc: 'Give each group its items' },
      { id: 'family', icon: 'heart', label: 'Family contributions', desc: 'Track who gave what' },
      { id: 'ukugida', icon: 'send', label: 'Ukugida pledges', desc: 'Gifts pledged at the dance' },
      { id: 'umqombothi', icon: 'beer', label: 'Umqombothi brewing', desc: 'Steps and quantities', keywords: 'beer brew traditional' },
      { id: 'ukusoka', icon: 'gift', label: 'Ukusoka', desc: 'Preparing with the ingcibi', keywords: 'circumcision initiation' },
      { id: 'rites', icon: 'footprints', label: 'Ancestral rites', desc: 'Each step and its meaning', keywords: 'ancestors amasiko' },
    ],
  },
  {
    title: 'Usapho & Inkcubeko',
    english: 'Family & culture',
    color: '#4a7a4a',
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
    color: '#c1922f',
    items: [
      { id: 'myorders', icon: 'package', label: 'My orders', desc: 'Track your bulk orders', keywords: 'delivery' },
      { id: 'expenditure', icon: 'coins', label: 'My spending', desc: 'Where the money went', keywords: 'budget' },
      { id: 'ubuhlanti', icon: 'flame', label: 'Ubuhlanti fund', desc: 'Grow our community economy', keywords: 'shrine' },
      { id: 'directory', icon: 'book', label: 'Healers, ingcibi & vendors', desc: 'Trusted traditional help', keywords: 'igqirha sangoma merchant' },
      { id: 'ekoyini', icon: 'cocktail', label: 'Ekoyini mobile bar', desc: 'Book a bar for your event' },
      { id: 'supplier', icon: 'store', label: 'Sell on iCamagu', desc: 'Supply stokvels and families', keywords: 'supplier producer' },
    ],
  },
]

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
    <div className="mx-auto min-h-screen max-w-md bg-cream px-5 pb-28 pt-6">
      <PageHeader
        eyebrow="Konke okunye"
        title="More"
        subtitle="Every tool for your ceremony, your family and your money."
      />

      {user && (
        <button
          type="button"
          onClick={() => handleNav('profile')}
          className="umbhaco grain pressable mb-5 w-full overflow-hidden rounded-[24px] px-5 pb-10 pt-5 text-left shadow-card"
        >
          <span className="relative z-10 flex items-center gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream/15 ring-2 ring-ochre-light/80 ring-offset-2 ring-offset-terracotta-dark">
              {user.profileImage
                ? <img src={user.profileImage} alt="" className="h-full w-full object-cover" />
                : <span className="font-display text-xl font-semibold text-cream">{initials || <Icon name="user" size={22} color="#f5f3ee" />}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="eyebrow block text-cream/75">{user.paternalIziduko ? `Clan · ${user.paternalIziduko}` : 'Your profile'}</span>
              <span className="mt-0.5 block truncate font-display text-xl font-semibold text-cream">{fullName || 'Your profile'}</span>
              <span className="mt-0.5 block text-xs text-cream/85">
                {user.paternalIziduko ? 'View and edit your profile' : 'Add your iziduko so your clan can find you'}
              </span>
            </span>
            <Icon name="arrowRight" size={18} color="#f5f3ee" />
          </span>
        </button>
      )}

      <label className="relative mb-6 block">
        <span className="sr-only">Search tools</span>
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <Icon name="search" size={17} color={MUTED} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search, e.g. umqombothi, pledges, orders"
          className="h-12 w-full rounded-pill border border-ink/10 bg-white pl-11 pr-11 text-sm shadow-soft focus:border-terracotta focus:outline-none"
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
              <GroupHeading title="Kutshanje" english="Recently used" />
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

          {TILE_GROUPS.map((group) => (
            <section key={group.title} className="mb-7">
              <GroupHeading title={group.title} english={group.english} color={group.color} />
              <div className="grid grid-cols-3 gap-2.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className="pressable relative flex min-h-[124px] flex-col items-start gap-2.5 overflow-hidden rounded-[18px] border border-ink/[0.06] bg-white p-3 text-left shadow-soft"
                  >
                    <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: group.color }} />
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${group.color}1a` }}>
                      <Icon name={item.icon} size={19} color={group.color} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold leading-tight text-ink">{item.label}</span>
                      <span className="mt-1 line-clamp-2 block text-[10.5px] leading-snug text-ink-muted">{item.desc}</span>
                    </span>
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
        <p className="font-display text-base italic text-ink">Umntu ngumntu ngabantu</p>
        <p className="mt-1 text-xs text-ink-muted">A person is a person through other people.</p>
      </footer>
    </div>
  )
}
