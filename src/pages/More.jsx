import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { cn } from '../lib/utils'

const SECTIONS = [
  {
    title: 'Ceremony & Culture',
    items: [
      { id: 'ceremony', emoji: '📋', label: 'Ceremony Preparation' },
      { id: 'family', emoji: '👨‍👩‍👧', label: 'Family Contributions' },
      { id: 'hierarchy', emoji: '👥', label: 'Umgidi Hierarchy' },
      { id: 'legends', emoji: '🏛️', label: 'House of AmaXhosa' },
      { id: 'ukusoka', emoji: '🎁', label: 'Ukusoka' },
    ],
  },
  {
    title: 'Money & Community',
    items: [
      { id: 'ukugida', emoji: '🎁', label: 'Ukugida' },
      { id: 'myorders', emoji: '📦', label: 'My Orders' },
      { id: 'expenditure', emoji: '💰', label: 'My Spending' },
    ],
  },
  {
    title: 'Services',
    items: [
      { id: 'ekoyini', emoji: '🍸', label: 'Ekoyini Mobile Bar' },
      { id: 'portal', emoji: '🖼️', label: 'Digital Portal' },
      { id: 'directory', emoji: '📖', label: 'Directory' },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'pin', emoji: '🔐', label: 'Security PIN' },
      { id: 'account', emoji: '🔒', label: 'Account & Privacy' },
      { id: 'help', emoji: '❓', label: 'Help & Support' },
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
                <span className="text-xl flex-shrink-0">{item.emoji}</span>
                <span className="font-bold text-sm text-ink flex-1">{item.label}</span>
                <span className="text-ink-muted text-sm">→</span>
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
            'w-full bg-white border-2 border-ink text-ink font-bold py-3.5 rounded-pill',
            'hover:bg-ink hover:text-white transition-colors duration-200',
            pressable
          )}
        >
          🚪 Log Out
        </button>
      </div>
    </div>
  )
        }
