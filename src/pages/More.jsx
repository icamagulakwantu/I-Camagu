import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { cn } from '../lib/utils'
import Icon from '../components/Icon.jsx'

const SECTIONS = [
  {
    title: 'Ceremony & Culture',
    items: [
      { id: 'ceremony', icon: 'clipboard', label: 'Ceremony Preparation' },
      { id: 'templates', icon: 'template', label: 'Ceremony Templates' },
      { id: 'family', icon: 'heart', label: 'Family Contributions' },
      { id: 'hierarchy', icon: 'users', label: 'Umgidi Hierarchy' },
      { id: 'legends', icon: 'landmark', label: 'House of AmaXhosa' },
      { id: 'ukusoka', icon: 'gift', label: 'Ukusoka' },
      { id: 'umqombothi', icon: 'beer', label: 'Umqombothi Brewing' },
      { id: 'iziduko', icon: 'link', label: 'Iziduko Network' },
    ],
  },
  {
    title: 'Money & Community',
    items: [
      { id: 'ukugida', icon: 'send', label: 'Ukugida' },
      { id: 'myorders', icon: 'package', label: 'My Orders' },
      { id: 'expenditure', icon: 'coins', label: 'My Spending' },
      { id: 'supplier', icon: 'store', label: 'Supplier Dashboard' },
      { id: 'shrinefund', icon: 'flame', label: 'Shrine Fund' },
    ],
  },
  {
    title: 'Services',
    items: [
      { id: 'ekoyini', icon: 'cocktail', label: 'Ekoyini Mobile Bar' },
      { id: 'ekoyiniadmin', icon: 'settings', label: 'Ekoyini Admin' },
      { id: 'identityadmin', icon: 'key', label: 'Identity Admin' },
      { id: 'portal', icon: 'image', label: 'Digital Portal' },
      { id: 'directory', icon: 'book', label: 'Directory' },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'profile', icon: 'user', label: 'Profile' },
      { id: 'activity', icon: 'activity', label: 'My Activity' },
      { id: 'pin', icon: 'key', label: 'Security PIN' },
      { id: 'account', icon: 'lock', label: 'Account & Privacy' },
      { id: 'privacy', icon: 'file', label: 'Privacy Policy' },
      { id: 'help', icon: 'help', label: 'Help & Support' },
    ],
  },
]

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.98]'

export default function More({ onNavigate }) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()

  const handleNav = (screen) => {
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

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <div className="mb-6 px-1">
        <h1 className="font-display font-bold text-3xl text-ink mb-1">More</h1>
        <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">All features & settings</p>
      </div>

      {user && (
        <div className="card-ink mb-6 flex items-center gap-4 rounded-soft px-5 py-5">
          <span className="w-12 h-12 rounded-full bg-terracotta/20 flex items-center justify-center flex-shrink-0">
            <Icon name="user" size={22} color="#c45c26" />
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-lg text-cream truncate">{user.firstName} {user.lastName}</p>
            {user.paternalIziduko && <p className="text-xs text-cream/55 mt-0.5">{user.paternalIziduko}</p>}
          </div>
        </div>
      )}

      {SECTIONS.map((section, sectionIndex) => {
        const alt = sectionIndex % 2 === 1
        return (
          <div key={section.title} className="mb-6">
            <div className="flex items-center gap-3 mb-2 px-1">
              <p className={`text-xs font-black uppercase ${alt ? 'text-brand-ochre' : 'text-terracotta'}`}>{section.title}</p>
              <span className="h-px flex-1 bg-terracotta/10" />
            </div>
            <div className={cn('card-paper divide-y divide-terracotta/10 overflow-hidden', alt && 'wash-clay')}>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 p-4 text-left hover:bg-sage-50/50 active:bg-sage-50 transition-colors',
                    pressable
                  )}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${alt ? 'bg-brand-ochre/12' : 'bg-terracotta/10'}`}>
                    <Icon name={item.icon} size={18} color={alt ? '#c1922f' : '#c45c26'} />
                  </div>
                  <span className="font-bold text-sm text-ink flex-1">{item.label}</span>
                  <Icon name="arrowRight" size={16} color="#8a8278" />
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <div className="mt-8 mb-8">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'w-full bg-white border-2 border-terracotta/25 text-ink font-bold py-3.5 rounded-pill flex items-center justify-center gap-2',
            'hover:bg-ink hover:text-white transition-colors duration-200',
            pressable
          )}
        >
          <Icon name="logout" size={18} /> Log Out
        </button>
      </div>
    </div>
  )
}
