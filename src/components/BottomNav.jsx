import Icon from './Icon.jsx'

function BottomNav({ activeScreen, onNavigate, basketCount = 0, pendingApprovals = 0 }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'ceremonyhub', label: 'Ceremonies', icon: 'calendar' },
    { id: 'store', label: 'Store', icon: 'cart', isCenter: true },
    { id: 'stokvels', label: 'Stokvels', icon: 'users', badge: pendingApprovals },
    { id: 'more', label: 'More', icon: 'menu' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 print:hidden">
      <div className="max-w-md mx-auto relative">
        <div className="bg-white rounded-t-[28px] shadow-[0_-4px_20px_rgba(43,38,32,0.12)] border-t border-brand-black/10 flex pt-2 pb-2 px-2">
          {tabs.filter(t => !t.isCenter).slice(0, 2).map((tab) => (
            <button key={tab.id} onClick={() => onNavigate(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 transition-colors relative ${activeScreen === tab.id ? 'text-brand-blue' : 'text-brand-black/40'}`}>
              <Icon name={tab.icon} size={20} className="mb-0.5" />
              <span className="text-[10px] font-bold uppercase tracking-wide">{tab.label}</span>
            </button>
          ))}
          <div className="w-16" />
          {tabs.filter(t => !t.isCenter).slice(2).map((tab) => (
            <button key={tab.id} onClick={() => onNavigate(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 transition-colors relative ${activeScreen === tab.id ? 'text-brand-blue' : 'text-brand-black/40'}`}>
              <Icon name={tab.icon} size={20} className="mb-0.5" />
              {tab.badge > 0 && (
                <span className="absolute top-0 right-4 bg-terracotta text-white text-[9px] font-black w-4 h-4 rounded-pill flex items-center justify-center">{tab.badge}</span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wide">{tab.label}</span>
            </button>
          ))}
        </div>

        <button onClick={() => onNavigate('store')} aria-label="Store"
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-16 h-16 rounded-pill bg-terracotta shadow-[0_4px_14px_rgba(196,92,38,0.4)] flex items-center justify-center border-4 border-brand-cream">
          <Icon name="cart" size={26} color="#fff" strokeWidth={1.6} />
          {basketCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-brand-blue text-white text-[10px] font-black w-5 h-5 rounded-pill flex items-center justify-center">{basketCount}</span>
          )}
        </button>
      </div>
    </nav>
  )
}

export default BottomNav
