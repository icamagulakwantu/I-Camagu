import Icon from '../Icon.jsx'

// One header for every main screen: back link, isiXhosa eyebrow, title and
// a short explanation. Using the same header everywhere is what makes the
// tabs feel like one app. (The beadwork stripe now lives only on the
// bottom navigation, so headers stay clean.)
export default function PageHeader({ eyebrow, title, subtitle, note, onBack, backLabel = 'Back', action = null, className = '' }) {
  return (
    <header className={`pb-5 ${className}`}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="pressable mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted"
        >
          <Icon name="arrowLeft" size={16} /> {backLabel}
        </button>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1 text-terracotta">{eyebrow}</p>}
          <h1 className="font-display text-[2rem] font-semibold leading-[1.05] tracking-tight text-ink">{title}</h1>
        </div>
        {action}
      </div>
      {subtitle && <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-ink-muted">{subtitle}</p>}
      {note && <p className="mt-0.5 text-xs text-ink-muted/80">{note}</p>}
    </header>
  )
}
