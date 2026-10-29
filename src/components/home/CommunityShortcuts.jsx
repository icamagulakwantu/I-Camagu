import Icon from '../Icon.jsx'

// Everything around the ceremony that is not money: your people, trusted
// traditional help, and the shared fund that builds the Xhosa economy.
const SHORTCUTS = [
  { screen: 'iziduko', icon: 'link', color: '#4a7a4a', title: 'Find your clan', desc: 'Siblings & clan members' },
  { screen: 'directory', icon: 'book', color: '#c1922f', title: 'Healers & ingcibi', desc: 'Trusted traditional help' },
  { screen: 'shrinefund', icon: 'flame', color: '#c45c26', title: 'Ubuhlanti', desc: 'Build the Xhosa economy' },
]

export default function CommunityShortcuts({ onNavigate, clanCeremonies = [] }) {
  return (
    <section className="mb-6" aria-label="Community and culture">
      <p className="eyebrow text-terracotta">Abantu bakho · Your people</p>
      <h2 className="font-display text-xl font-bold text-ink mb-3">Community & culture</h2>
      <div className="grid grid-cols-3 gap-2">
        {SHORTCUTS.map((s) => (
          <button
            key={s.screen}
            type="button"
            onClick={() => onNavigate(s.screen)}
            className="pressable flex flex-col items-start gap-2 rounded-soft p-3 text-left"
            style={{ backgroundColor: `${s.color}17` }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: s.color }}>
              <Icon name={s.icon} size={17} color="#ffffff" />
            </span>
            <span>
              <span className="block text-[13px] font-bold text-ink leading-tight">{s.title}</span>
              <span className="mt-0.5 block text-[11px] text-ink-muted leading-snug">{s.desc}</span>
            </span>
          </button>
        ))}
      </div>

      {clanCeremonies.length > 0 && (
        <div className="card-paper mt-3 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1">Upcoming in your clan</p>
          {clanCeremonies.slice(0, 3).map((ceremony) => (
            <div key={ceremony.id} className="py-2 border-t border-cream-dark/70 first:border-t-0">
              <p className="font-bold text-ink text-sm">{ceremony.title}</p>
              <p className="text-xs text-ink-muted">
                {ceremony.eventDate ? new Date(ceremony.eventDate).toLocaleDateString() : 'Date to be confirmed'}
                {' · '}{ceremony.host?.firstName || 'Community member'}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
