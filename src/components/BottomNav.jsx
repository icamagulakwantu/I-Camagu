import Icon from './Icon.jsx'

function BottomNav({ activeScreen, onNavigate, basketCount = 0, pendingApprovals = 0, unreadNotifications = 0 }) {
  // Same order as the "Your path" map on Home: save, buy in bulk, ceremony.
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home', badge: unreadNotifications },
    { id: 'stokvels', label: 'Stokvels', icon: 'coins', badge: pendingApprovals },
    { id: 'store', label: 'Bulk Buy', icon: 'cart', badge: basketCount },
    { id: 'ceremonyhub', label: 'Ceremonies', icon: 'calendar' },
    { id: 'more', label: 'More', icon: 'menu' },
  ]

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center print:hidden">
      <div className="pointer-events-auto safe-bottom mb-3 w-[min(100%-1rem,560px)]">
        <div className="relative overflow-hidden rounded-[26px] border border-ink/[0.08] bg-[#fffdf9]/95 px-1.5 pb-1.5 pt-2 shadow-[0_18px_40px_-18px_rgba(43,38,32,0.45)] backdrop-blur-md">
          <ul className="relative flex items-stretch">
            {tabs.map((tab) => {
              const active = activeScreen === tab.id
              return (
                <li key={tab.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => onNavigate(tab.id)}
                    aria-label={tab.badge > 0 ? `${tab.label}, ${tab.badge} new` : tab.label}
                    aria-current={active ? 'page' : undefined}
                    className="pressable flex min-h-[58px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-0.5"
                  >
                    <span className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-200 ${active ? 'bg-terracotta shadow-[0_6px_16px_-6px_rgba(196,92,38,0.9)]' : ''}`}>
                      <Icon name={tab.icon} size={19} color={active ? '#fff' : '#6b645a'} strokeWidth={active ? 2 : 1.7} />
                      {tab.badge > 0 && (
                        <span className="absolute -top-1.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-pill bg-brand-ochre text-brand-black text-xs font-black flex items-center justify-center ring-2 ring-[#fffdf9]">{tab.badge > 99 ? '99+' : tab.badge}</span>
                      )}
                    </span>
                    <span className={`max-w-full truncate text-[11px] sm:text-xs leading-tight text-center tracking-wide ${active ? 'font-bold text-terracotta-dark' : 'font-medium text-ink-muted'}`}>
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
