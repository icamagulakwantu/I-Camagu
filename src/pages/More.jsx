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
      { id: 'help', icon: 'help', label: 'Help & Support' },
    ],
  },
]

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.98]'

export default function More({ onNavigate }) {
  const { logout } = useAuth()
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

      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-6">
          <p className="text-xs font-black uppercase text-ink-muted mb-2 px-1">{section.title}</p>
          <div className="bg-white border-2 border-ink rounded-soft divide-y divide-ink/10 overflow-hidden shadow-sm">
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={cn(
                  'w-full flex items-center gap-3.5 p-4 text-left bg-white hover:bg-sage-50/50 active:bg-sage-50 transition-colors',
                  pressable
                )}
              >
                <div className="w-9 h-9 rounded-soft bg-cream flex items-center justify-center flex-shrink-0">
                  <Icon name={item.icon} size={18} color="#c45c26" />
                </div>
                <span className="font-bold text-sm text-ink flex-1">{item.label}</span>
                <Icon name="arrowRight" size={16} color="#8a8278" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-8 mb-8">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'w-full bg-white border-2 border-ink text-ink font-bold py-3.5 rounded-pill flex items-center justify-center gap-2',
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
