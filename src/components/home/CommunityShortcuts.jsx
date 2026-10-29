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
    <section className="mb-8" aria-label="Community and culture">
      <p className="eyebrow text-terracotta">Abantu bakho · Your people</p>
      <h2 className="font-display text-[1.4rem] font-semibold leading-tight text-ink mb-3">Community & culture</h2>
      <div className="grid grid-cols-3 gap-2.5">
        {SHORTCUTS.map((s) => (
          <button
            key={s.screen}
            type="button"
            onClick={() => onNavigate(s.screen)}
            className="pressable relative flex min-h-[124px] flex-col items-start gap-2.5 overflow-hidden rounded-[18px] border border-ink/[0.06] bg-white p-3 text-left shadow-soft"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: s.color }} />
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}1a` }}>
              <Icon name={s.icon} size={19} color={s.color} />
            </span>
            <span>
              <span className="block text-[13px] font-bold text-ink leading-tight">{s.title}</span>
              <span className="mt-1 block text-[11px] text-ink-muted leading-snug">{s.desc}</span>
            </span>
          </button>
        ))}
      </div>

      {clanCeremonies.length > 0 && (
        <div className="card-paper card-spine mt-3 p-4 pl-5">
          <p className="eyebrow mb-1">Upcoming in your clan</p>
          {clanCeremonies.slice(0, 3).map((ceremony) => (
            <div key={ceremony.id} className="flex items-center gap-3 py-2.5 border-t border-ink/[0.06] first:border-t-0">
              <span className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-terracotta/10 leading-none">
                {ceremony.eventDate ? (
                  <>
                    <span className="font-display text-base font-semibold text-terracotta">{new Date(ceremony.eventDate).getDate()}</span>
                    <span className="text-[9px] font-bold uppercase text-terracotta/80">{new Date(ceremony.eventDate).toLocaleDateString('en-ZA', { month: 'short' })}</span>
                  </>
                ) : (
                  <Icon name="calendar" size={16} color="#c45c26" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-ink text-sm">{ceremony.title}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {ceremony.eventDate ? '' : 'Date to be confirmed · '}Hosted by {ceremony.host?.firstName || 'a clan member'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
