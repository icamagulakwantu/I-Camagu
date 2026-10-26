import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { cn } from '../lib/utils'
import Icon from '../components/Icon.jsx'
import AncestralRites from './AncestralRites.jsx'

const SECTIONS = [
  {
    title: 'Inkcubeko yam',
    english: 'My Culture',
    items: [
      { id: 'rites', icon: 'footprints', label: 'Ancestral Rites List', hint: 'Rites still owed to our ancestors' },
      { id: 'ceremony', icon: 'clipboard', label: 'Ceremony Preparation', hint: 'Plan a ceremony step by step' },
      { id: 'hierarchy', icon: 'users', label: 'Umgidi Hierarchy' },
      { id: 'templates', icon: 'template', label: 'Ceremony Templates' },
      { id: 'family', icon: 'heart', label: 'Family Contributions' },
      { id: 'iziduko', icon: 'link', label: 'Iziduko Network', hint: 'Find relatives by clan name' },
      { id: 'clangroups', icon: 'users', label: 'Clan Groups', hint: 'Bring your clan or WhatsApp group here' },
      { id: 'legends', icon: 'landmark', label: 'House of AmaXhosa' },
      { id: 'ukusoka', icon: 'gift', label: 'Ukusoka' },
      { id: 'umqombothi', icon: 'beer', label: 'Umqombothi Brewing' },
    ],
  },
  {
    title: 'Imali & Iiodolo zam',
    english: 'My Money & Orders',
    items: [
      { id: 'ukugida', icon: 'send', label: 'Ukugida' },
      { id: 'myorders', icon: 'package', label: 'My Orders' },
      { id: 'expenditure', icon: 'coins', label: 'My Spending' },
    ],
  },
  {
    title: 'Iinkonzo Zoluntu',
    english: 'Community Services',
    items: [
      { id: 'ekoyini', icon: 'cocktail', label: 'Ekoyini Mobile Bar' },
      { id: 'supplier', icon: 'store', label: 'Supplier Dashboard' },
      { id: 'portal', icon: 'image', label: 'Digital Portal' },
      { id: 'directory', icon: 'book', label: 'Directory' },
    ],
  },
  {
    title: 'Profile & Security',
    items: [
      { id: 'profile', icon: 'user', label: 'Profile' },
      { id: 'activity', icon: 'activity', label: 'My Activity' },
      { id: 'pin', icon: 'key', label: 'Security PIN' },
      { id: 'account', icon: 'lock', label: 'Account & Privacy' },
    ],
  },
  {
    title: 'Help & Legal',
    items: [
      { id: 'help', icon: 'help', label: 'Help & Support' },
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

const SIGNPOSTS = [
  { icon: 'cart', text: 'Buy in bulk and save', where: 'SmartMatch tab at the bottom' },
  { icon: 'users', text: 'Save, lend and pay out together', where: 'Stokvels tab at the bottom' },
  { icon: 'calendar', text: 'Plan a ceremony', where: 'Ceremonies tab at the bottom' },
  { icon: 'footprints', text: 'List rites owed to ancestors', where: 'Ancestral Rites List below' },
]

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.98]'

export default function More({ onNavigate }) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [showRites, setShowRites] = useState(false)

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
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <div className="mb-6 px-1">
        {/* Xhosa eyebrow with English subtext */}
        <p className="eyebrow text-terracotta">Konke okukhoyo</p>
        <p className="text-[10px] text-ink-muted mb-1">My profile, community &amp; settings</p>
        <h1 className="font-display font-bold text-3xl text-ink">Me</h1>
      </div>

      {user && (
        <div className="wash-ember grain mb-4 flex items-center gap-4 rounded-soft px-5 py-5">
          <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <Icon name="user" size={22} color="#ffffff" />
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-lg text-cream truncate">{user.firstName} {user.lastName}</p>
            {user.paternalIziduko && <p className="text-xs text-cream/80 mt-0.5">{user.paternalIziduko}</p>}
          </div>
        </div>
      )}

      <div className="mb-5 rounded-soft border-2 border-brand-ochre/40 bg-brand-ochre/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="mapPin" size={16} color="#c45c26" />
          <p className="text-xs font-black uppercase text-terracotta">Lost? Start here</p>
        </div>
        <ul className="space-y-2">
          {SIGNPOSTS.map((s) => (
            <li key={s.text} className="flex items-start gap-2.5">
              <Icon name={s.icon} size={15} color="#c45c26" className="mt-0.5 flex-shrink-0" />
              <p className="text-xs text-ink leading-snug">
                <span className="font-bold">{s.text}</span>
                <span className="text-ink-muted"> → {s.where}</span>
              </p>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-ink-muted mt-3">Saved screens still open without internet. Changes are sent once you are back online.</p>
      </div>

      {/* ── Ubuhlanti featured card */}
      <button
        type="button"
        onClick={() => handleNav('shrinefund')}
        className={`w-full mb-5 rounded-soft overflow-hidden text-left ${pressable}`}
        style={{ background: 'linear-gradient(135deg, #c45c26 0%, #8c3b1a 100%)' }}
      >
        <div className="px-5 py-4">
          <div className="flex items-center gap-2.5 mb-2">
            <Icon name="flame" size={20} color="#ffffff" strokeWidth={1.5} />
            <p className="eyebrow text-white/90">Ubuhlanti bakwa Xhosa</p>
          </div>
          <p className="font-display font-bold text-xl text-white leading-tight mb-1">
            A sacred sanctuary for the Xhosa nation
          </p>
          <p className="text-white/90 text-xs leading-relaxed">
            A blessed kraal where families without a homestead can perform rites for their ancestors, supported by community tithes, and a fund building township prosperity.
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">Jonga Ubuhlanti</span>
            <Icon name="arrowRight" size={13} color="#ffffff" />
          </div>
          <p className="text-white/90 text-[10px] mt-0.5">View Ubuhlanti</p>
        </div>
      </button>

      {SECTIONS.filter((section) => !section.adminOnly || user?.isAdmin).map((section, sectionIndex) => {
        const alt = sectionIndex % 2 === 1
        const items = section.items.filter((item) => !item.adminOnly || user?.isAdmin)
        if (items.length === 0) return null
        return (
          <div key={section.title} className="mb-6">
            <div className="flex items-start gap-3 mb-2 px-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase text-terracotta">{section.title}</p>
                {/* English subtext for translated section titles */}
                {section.english && (
                  <p className="text-[10px] text-ink-muted">{section.english}</p>
                )}
              </div>
              <span className="h-px flex-1 bg-terracotta/10 mt-2" />
            </div>
            <div className={cn('card-paper divide-y divide-terracotta/10 overflow-hidden', alt && 'wash-clay')}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 p-4 text-left hover:bg-sage-50/50 active:bg-sage-50 transition-colors',
                    pressable
                  )}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-terracotta/10">
                    <Icon name={item.icon} size={18} color="#c45c26" />
                  </div>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-ink">{item.label}</span>
                    {item.hint && <span className="block text-[11px] text-ink-muted mt-0.5">{item.hint}</span>}
                  </span>
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
          <Icon name="logout" size={18} /> Phuma — Log Out
        </button>
      </div>
    </div>
  )
}
