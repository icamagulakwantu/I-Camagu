import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { cn } from '../lib/utils'
import Icon from '../components/Icon.jsx'
import AncestralRites from './AncestralRites.jsx'

// Colourful tile groups, one colour per kind of thing, matching Home:
// terracotta = ceremony, sage = family & culture, ochre = money & services.
// Nothing that already has its own bottom tab is repeated here.
const TILE_GROUPS = [
  {
    title: 'Imisebenzi',
    english: 'Ceremony tools',
    color: '#c45c26',
    items: [
      { id: 'templates', icon: 'template', label: 'Ceremony templates' },
      { id: 'hierarchy', icon: 'users', label: 'Who brings what' },
      { id: 'family', icon: 'heart', label: 'Family contributions' },
      { id: 'ukugida', icon: 'send', label: 'Ukugida pledges' },
      { id: 'umqombothi', icon: 'beer', label: 'Umqombothi brewing' },
      { id: 'ukusoka', icon: 'gift', label: 'Ukusoka' },
      { id: 'rites', icon: 'footprints', label: 'Ancestral rites' },
    ],
  },
  {
    title: 'Usapho & Inkcubeko',
    english: 'Family & culture',
    color: '#4a7a4a',
    items: [
      { id: 'iziduko', icon: 'link', label: 'Find clan members' },
      { id: 'clangroups', icon: 'users', label: 'Clan groups' },
      { id: 'legends', icon: 'landmark', label: 'House of AmaXhosa' },
      { id: 'portal', icon: 'image', label: 'Family archive' },
    ],
  },
  {
    title: 'Imali & Iinkonzo',
    english: 'Money & services',
    color: '#c1922f',
    items: [
      { id: 'myorders', icon: 'package', label: 'My orders' },
      { id: 'expenditure', icon: 'coins', label: 'My spending' },
      { id: 'ubuhlanti', icon: 'flame', label: 'Ubuhlanti fund' },
      { id: 'directory', icon: 'book', label: 'Healers, ingcibi & vendors' },
      { id: 'ekoyini', icon: 'cocktail', label: 'Ekoyini mobile bar' },
      { id: 'supplier', icon: 'store', label: 'Sell on iCamagu' },
    ],
  },
]

const LIST_GROUPS = [
  {
    title: 'Iakhawunti yam',
    english: 'My account',
    items: [
      { id: 'profile', icon: 'user', label: 'Profile' },
      { id: 'activity', icon: 'activity', label: 'My activity' },
      { id: 'pin', icon: 'key', label: 'Security PIN' },
      { id: 'account', icon: 'lock', label: 'Account & privacy' },
      { id: 'help', icon: 'help', label: 'Help' },
      { id: 'privacy', icon: 'file', label: 'Privacy policy' },
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

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.97]'

function GroupHeading({ title, english, color }) {
  return (
    <p className="flex items-center gap-2 px-1 pb-2">
      <span className="eyebrow" style={color ? { color } : undefined}>{title}</span>
      {english && <span className="text-xs text-ink-muted">· {english}</span>}
    </p>
  )
}

export default function More({ onNavigate }) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [showRites, setShowRites] = useState(false)

  const handleNav = (screen) => {
    if (screen === 'rites') { setShowRites(true); window.scrollTo(0, 0); return }
    if (screen === 'ubuhlanti') screen = 'shrinefund'
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
        onOpenUbuhlanti={() => handleNav('shrinefund')}
        onOpenProfile={() => handleNav('profile')}
      />
    )
  }

  return (
    <div className="min-h-screen pb-28 bg-cream px-4 pt-6 max-w-md mx-auto">
      <h1 className="font-display font-bold text-2xl text-ink px-1 mb-4">More</h1>

      {user && (
        <button
          type="button"
          onClick={() => handleNav('profile')}
          className={`card-paper mb-5 flex w-full items-center gap-3 px-4 py-3 text-left ${pressable}`}
        >
          <span className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user.profileImage
              ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
              : <Icon name="user" size={18} color="#c45c26" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-sm text-ink truncate">{user.firstName} {user.lastName}</span>
            <span className="block text-xs text-ink-muted truncate">{user.paternalIziduko || 'View your profile'}</span>
          </span>
          <Icon name="arrowRight" size={16} color="#6b645a" />
        </button>
      )}

      {TILE_GROUPS.map((group) => (
        <section key={group.title} className="mb-5">
          <GroupHeading title={group.title} english={group.english} color={group.color} />
          <div className="grid grid-cols-3 gap-2">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`flex min-h-[96px] flex-col items-start justify-between gap-2 rounded-soft p-3 text-left ${pressable}`}
                style={{ backgroundColor: `${group.color}17` }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: group.color }}>
                  <Icon name={item.icon} size={17} color="#ffffff" />
                </span>
                <span className="text-xs font-bold leading-tight text-ink">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {LIST_GROUPS.filter((group) => !group.adminOnly || user?.isAdmin).map((group) => (
        <section key={group.title} className="mb-5">
          <GroupHeading title={group.title} english={group.english} color="#2b2620" />
          <div className="card-paper divide-y divide-terracotta/10 overflow-hidden">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-sage-50/50 active:bg-sage-50 transition-colors"
              >
                <Icon name={item.icon} size={17} color="#6b645a" />
                <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{item.label}</span>
                <Icon name="arrowRight" size={14} color="#6b645a" />
              </button>
            ))}
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          'mt-2 mb-8 w-full py-3 rounded-pill flex items-center justify-center gap-2 text-sm font-bold text-terracotta',
          'hover:bg-terracotta/10 transition-colors',
          pressable
        )}
      >
        <Icon name="logout" size={16} color="#c45c26" /> Phuma — Log Out
      </button>
    </div>
  )
}
