import Icon from './Icon.jsx'

function BottomNav({ activeScreen, onNavigate, basketCount = 0, pendingApprovals = 0, unreadNotifications = 0 }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home', badge: unreadNotifications },
    { id: 'ceremonyhub', label: 'Ceremonies', icon: 'calendar' },
    { id: 'store', label: 'SmartMatch', icon: 'cart', badge: basketCount },
    { id: 'stokvels', label: 'Stokvels', icon: 'users', badge: pendingApprovals },
    { id: 'more', label: 'Me', icon: 'user-round' },
  ]

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center print:hidden">
      <div className="pointer-events-auto safe-bottom mb-3 w-[min(100%-1.5rem,406px)]">
        <div className="grain relative overflow-hidden rounded-[26px] bg-brand-black px-1.5 py-1.5 shadow-[0_22px_44px_-22px_rgba(43,38,32,0.55)]">
          <div className="motif-thresholds absolute inset-x-0 top-0 h-px opacity-60" />
          <ul className="relative flex items-stretch">
            {tabs.map((tab) => {
              const active = activeScreen === tab.id
              return (
                <li key={tab.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => onNavigate(tab.id)}
                    aria-label={tab.label}
                    aria-current={active ? 'page' : undefined}
                    className="pressable flex h-[58px] w-full flex-col items-center justify-center gap-1 rounded-[20px]"
                  >
                    <span className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${active ? 'bg-terracotta' : ''}`}>
                      {active && <span className="absolute inset-[-4px] rounded-full border border-brand-ochre/45" />}
                      <Icon name={tab.icon} size={18} color={active ? '#fff' : 'rgba(245,243,238,0.6)'} strokeWidth={active ? 2 : 1.6} />
                      {tab.badge > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-terracotta text-white text-[9px] font-black w-4 h-4 rounded-pill flex items-center justify-center">{tab.badge}</span>
                      )}
                    </span>
                    <span className={`text-[10px] leading-none tracking-wide ${active ? 'font-bold text-cream' : 'text-cream/55'}`}>
                      {tab.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
