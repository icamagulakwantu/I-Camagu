import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { cn } from '../lib/utils'
import Icon from '../components/Icon.jsx'
import AncestralRites from './AncestralRites.jsx'

// The things people reach for most, shown as big buttons at the top so
// nobody has to open a section and hunt for them.
const QUICK_LINKS = [
  { id: 'myorders', icon: 'package', label: 'My Orders' },
  { id: 'profile', icon: 'user', label: 'My Profile' },
  { id: 'rites', icon: 'footprints', label: 'Ancestral Rites' },
  { id: 'help', icon: 'help', label: 'Get Help' },
]

// Grouped into fewer, plainly-named sections (was six). Items already shown
// in QUICK_LINKS are not repeated here.
const SECTIONS = [
  {
    title: 'Inkcubeko yam',
    english: 'My Culture',
    items: [
      { id: 'ceremony', icon: 'clipboard', label: 'Ceremony Preparation', hint: 'Plan a ceremony step by step' },
      { id: 'templates', icon: 'template', label: 'Ceremony Templates', hint: 'Ready-made lists to start from' },
      { id: 'hierarchy', icon: 'users', label: 'Umgidi Hierarchy', hint: 'Who does what at the umgidi' },
      { id: 'family', icon: 'heart', label: 'Family Contributions', hint: 'Track what each family member gives' },
      { id: 'iziduko', icon: 'link', label: 'Iziduko Network', hint: 'Find relatives by clan name' },
      { id: 'clangroups', icon: 'users', label: 'Clan Groups', hint: 'Bring your clan or WhatsApp group here' },
      { id: 'legends', icon: 'landmark', label: 'House of AmaXhosa', hint: 'Stories and history' },
      { id: 'ukusoka', icon: 'gift', label: 'Ukusoka', hint: 'Prepare for initiation' },
      { id: 'umqombothi', icon: 'beer', label: 'Umqombothi Brewing', hint: 'Work out how much to brew' },
    ],
  },
  {
    title: 'Imali & Iinkonzo',
    english: 'Money & Services',
    items: [
      { id: 'ukugida', icon: 'send', label: 'Ukugida', hint: 'Send money for a celebration' },
      { id: 'expenditure', icon: 'coins', label: 'My Spending', hint: 'See where your money went' },
      { id: 'ekoyini', icon: 'cocktail', label: 'Ekoyini Mobile Bar', hint: 'Book a bar for your event' },
      { id: 'directory', icon: 'book', label: 'Directory', hint: 'Find local service providers' },
      { id: 'supplier', icon: 'store', label: 'Supplier Dashboard', hint: 'For people who sell on iCamagu' },
      { id: 'portal', icon: 'image', label: 'Digital Portal' },
    ],
  },
  {
    title: 'Iakhawunti yam',
    english: 'My Account',
    items: [
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
  // Everything starts open: hidden menus were the main reason people
  // couldn't find things. Sections can still be folded away.
  const [collapsedSections, setCollapsedSections] = useState([])

  const toggleSection = (title) => setCollapsedSections((current) =>
    current.includes(title) ? current.filter((item) => item !== title) : [...current, title]
  )

  const handleNav = (screen) => {
    if (screen === 'rites') { setShowRites(true); window.scrollTo(0, 0); return }
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
    <div className="min-h-screen pb-28 bg-cream px-4 pt-6">
      <div className="mb-5 px-1">
        <p className="eyebrow text-terracotta">Konke okukhoyo</p>
        <h1 className="font-display font-bold text-3xl text-ink">More</h1>
        <p className="text-sm text-ink-muted mt-1">Your profile, culture tools and settings</p>
      </div>

      {user && (
        <button
          type="button"
          onClick={() => handleNav('profile')}
          className={`wash-ember grain mb-4 flex w-full items-center gap-4 rounded-soft px-5 py-4 text-left ${pressable}`}
        >
          <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <Icon name="user" size={22} color="#ffffff" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display font-bold text-lg text-white truncate">{user.firstName} {user.lastName}</span>
            {user.paternalIziduko && <span className="block text-sm text-white/90 mt-0.5">{user.paternalIziduko}</span>}
          </span>
          <Icon name="arrowRight" size={18} color="#ffffff" />
        </button>
      )}

      {/* Big, always-visible shortcuts */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {QUICK_LINKS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNav(item.id)}
            className={`card-paper flex min-h-[88px] flex-col items-start justify-between gap-2 p-4 text-left ${pressable}`}
          >
            <span className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center">
              <Icon name={item.icon} size={20} color="#c45c26" />
            </span>
            <span className="font-bold text-base text-ink leading-tight">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Ubuhlanti featured card */}
      <button
        type="button"
        onClick={() => handleNav('shrinefund')}
        className={`w-full mb-6 rounded-soft overflow-hidden text-left ${pressable}`}
        style={{ background: 'linear-gradient(135deg, #c45c26 0%, #8c3b1a 100%)' }}
      >
        <div className="px-5 py-4">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Icon name="flame" size={20} color="#ffffff" strokeWidth={1.5} />
            <p className="eyebrow text-white">Ubuhlanti bakwa Xhosa</p>
          </div>
          <p className="font-display font-bold text-lg text-white leading-tight mb-1">
            A sacred kraal for families without a homestead
          </p>
          <p className="text-white text-sm leading-relaxed">
            Perform rites for your ancestors, supported by community tithes.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-white px-4 py-2">
            <span className="text-sm font-bold text-terracotta">Jonga Ubuhlanti — View</span>
            <Icon name="arrowRight" size={14} color="#c45c26" />
          </div>
        </div>
      </button>

      {SECTIONS.filter((section) => !section.adminOnly || user?.isAdmin).map((section) => {
        const open = !collapsedSections.includes(section.title)
        return (
          <section key={section.title} className="mb-5">
            <button
              type="button"
              onClick={() => toggleSection(section.title)}
              aria-expanded={open}
              className="w-full flex items-center gap-3 px-1 pb-2 text-left"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-black uppercase tracking-wide text-terracotta">{section.title}</span>
                {section.english && <span className="block text-sm text-ink-muted">{section.english}</span>}
              </span>
              <span className="text-sm font-semibold text-ink-muted">{open ? 'Hide' : 'Show'}</span>
              <Icon name={open ? 'arrowUp' : 'arrowDown'} size={18} color="#625b52" />
            </button>
            {open && (
              <div className="card-paper divide-y divide-terracotta/10 overflow-hidden">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className={cn(
                      'w-full flex min-h-[60px] items-center gap-3.5 px-4 py-3 text-left hover:bg-sage-50/50 active:bg-sage-50 transition-colors',
                      pressable
                    )}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-terracotta/10">
                      <Icon name={item.icon} size={19} color="#c45c26" />
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-base text-ink">{item.label}</span>
                      {item.hint && <span className="block text-sm text-ink-muted mt-0.5">{item.hint}</span>}
                    </span>
                    <Icon name="arrowRight" size={18} color="#625b52" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )
      })}

      <p className="text-sm text-ink-muted px-1 mb-6">Saved screens still open without internet. Changes are sent once you are back online.</p>

      <div className="mb-8">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'w-full min-h-[52px] bg-white border-2 border-terracotta/30 text-ink font-bold text-base rounded-pill flex items-center justify-center gap-2',
            'hover:bg-ink hover:text-white transition-colors duration-200',
            pressable
          )}
        >
          <Icon name="logout" size={18} /> Phuma — Log Out
        </button>
      </div>
    </div>
  )
}
