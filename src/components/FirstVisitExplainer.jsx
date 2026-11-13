import Icon from './Icon.jsx'

// Shown on Home only to brand-new users (no ceremonies, no stokvels yet).
// Each card is a real shortcut: tapping it opens that part of the app, so
// the explanation and the action are the same thing. Replaces the old
// "how it works" list and fake sample ceremony/pool, which were long and
// led nowhere.
const SHORTCUTS = [
  { screen: 'ceremonyhub', icon: 'calendarRange', accent: '#c45c26', title: 'Plan a ceremony', desc: 'Checklist, budget and family pledges' },
  { screen: 'store', icon: 'cart', accent: '#c1922f', title: 'Shop together', desc: 'Pool orders for bulk prices' },
  { screen: 'stokvels', icon: 'coins', accent: '#4a7a4a', title: 'Stokvels', desc: 'Save and pay out fairly' },
  { screen: 'iziduko', icon: 'link', accent: '#3d623d', title: 'Find your clan', desc: 'Connect through iziduko' },
]

export default function FirstVisitExplainer({ onNavigate }) {
  return (
    <section className="mb-5" aria-label="Get started">
      <p className="eyebrow text-terracotta mb-2 px-1">Qala apha · Start here</p>
      <div className="grid grid-cols-2 gap-2.5">
        {SHORTCUTS.map((s) => (
          <button
            key={s.screen}
            type="button"
            onClick={() => onNavigate(s.screen)}
            className="card-paper pressable flex flex-col items-start gap-2 p-3.5 text-left"
          >
            <span className="flex w-full items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${s.accent}1a` }}>
                <Icon name={s.icon} size={18} color={s.accent} />
              </span>
              <Icon name="arrowRight" size={15} color="#6b645a" />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink leading-tight">{s.title}</span>
              <span className="mt-0.5 block text-xs text-ink-muted leading-snug">{s.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
