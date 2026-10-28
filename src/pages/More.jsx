import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { cn } from '../lib/utils'
import Icon from '../components/Icon.jsx'
import AncestralRites from './AncestralRites.jsx'

// Most-used screens, shown as a compact row of shortcuts at the top.
const QUICK_LINKS = [
  { id: 'myorders', icon: 'package', label: 'Orders' },
  { id: 'rites', icon: 'footprints', label: 'Rites' },
  { id: 'ubuhlanti', icon: 'flame', label: 'Ubuhlanti' },
  { id: 'help', icon: 'help', label: 'Help' },
]

// Three plainly-named groups. Items in QUICK_LINKS are not repeated here.
const SECTIONS = [
  {
    title: 'Inkcubeko yam',
    english: 'My Culture',
    items: [
      { id: 'ceremony', icon: 'clipboard', label: 'Ceremony Preparation' },
      { id: 'templates', icon: 'template', label: 'Ceremony Templates' },
      { id: 'hierarchy', icon: 'users', label: 'Umgidi Hierarchy' },
      { id: 'family', icon: 'heart', label: 'Family Contributions' },
      { id: 'iziduko', icon: 'link', label: 'Iziduko Network' },
      { id: 'clangroups', icon: 'users', label: 'Clan Groups' },
      { id: 'legends', icon: 'landmark', label: 'House of AmaXhosa' },
      { id: 'ukusoka', icon: 'gift', label: 'Ukusoka' },
      { id: 'umqombothi', icon: 'beer', label: 'Umqombothi Brewing' },
    ],
  },
  {
    title: 'Imali & Iinkonzo',
    english: 'Money & Services',
    items: [
      { id: 'ukugida', icon: 'send', label: 'Ukugida' },
      { id: 'expenditure', icon: 'coins', label: 'My Spending' },
      { id: 'ekoyini', icon: 'cocktail', label: 'Ekoyini Mobile Bar' },
      { id: 'directory', icon: 'book', label: 'Directory' },
      { id: 'supplier', icon: 'store', label: 'Supplier Dashboard' },
      { id: 'portal', icon: 'image', label: 'Digital Portal' },
    ],
  },
  {
    title: 'Iakhawunti yam',
    english: 'My Account',
    items: [
      { id: 'profile', icon: 'user', label: 'Profile' },
      { id: 'activity', icon: 'activity', label: 'My Activity' },
      { id: 'pin', icon: 'key', label: 'Security PIN' },
      { id: 'account', icon: 'lock', label: 'Account & Privacy' },
      { id: 'privacy', icon: 'file', label: 'Privacy Policy' },
    ],
  },
  {
    title: 'Admin Tools',
    adminOnly: true,
    items: [
      { id: 'demandadmin', icon: 'coins', label: 'Demand & Suppliers' },
      { id: 'ekoyiniadmin', icon: 'settings', label: 'Ekoyini Admin' },
      { id: 'identityadmin', icon: 'key', label: 'Identity Admin' },
      { id: 'marginadmin', icon: 'chart', label: 'Cost & Margin' },
    ],
  },
]

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.98]'

export default function More({ onNavigate }) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [showRites, setShowRites] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState([])

  const toggleSection = (title) => setCollapsedSections((current) =>
    current.includes(title) ? current.filter((item) => item !== title) : [...current, title]
  )

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
          className={`card-paper mb-3 flex w-full items-center gap-3 px-4 py-3 text-left ${pressable}`}
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

      <div className="grid grid-cols-4 gap-2 mb-5">
        {QUICK_LINKS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNav(item.id)}
            className={`card-paper flex flex-col items-center gap-1.5 px-1 py-3 ${pressable}`}
          >
            <span className="w-9 h-9 rounded-full bg-terracotta/10 flex items-center justify-center">
              <Icon name={item.icon} size={17} color="#c45c26" />
            </span>
            <span className="text-xs font-semibold text-ink">{item.label}</span>
          </button>
        ))}
      </div>

      {SECTIONS.filter((section) => !section.adminOnly || user?.isAdmin).map((section) => {
        const open = !collapsedSections.includes(section.title)
        return (
          <section key={section.title} className="mb-4">
            <button
              type="button"
              onClick={() => toggleSection(section.title)}
              aria-expanded={open}
              className="w-full flex items-center gap-2 px-1 pb-1.5 text-left"
            >
              <span className="eyebrow text-terracotta">{section.title}</span>
              {section.english && <span className="text-xs text-ink-muted">· {section.english}</span>}
              <span className="flex-1" />
              <Icon name={open ? 'arrowUp' : 'arrowDown'} size={15} color="#6b645a" />
            </button>
            {open && (
              <div className="card-paper divide-y divide-terracotta/10 overflow-hidden">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-sage-50/50 active:bg-sage-50 transition-colors"
                  >
                    <Icon name={item.icon} size={17} color="#c45c26" />
                    <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{item.label}</span>
                    <Icon name="arrowRight" size={14} color="#6b645a" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )
      })}

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
