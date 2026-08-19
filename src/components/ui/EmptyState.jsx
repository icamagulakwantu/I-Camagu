import { cn } from '../../lib/utils'

export function EmptyState({ emoji = '📦', title, description, primaryLabel, onPrimary, secondaryLabel, onSecondary, className }) {
  return (
    <div className={cn('text-center p-8 bg-white border-2 border-brand-black rounded-soft animate-fade-in', className)}>
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sage-100 to-cream-dark flex items-center justify-center mx-auto mb-4 text-4xl animate-gentle-sway">
        {emoji}
      </div>
      <h3 className="font-display font-bold text-xl text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-muted mb-6 leading-relaxed max-w-[260px] mx-auto">
        {description}
      </p>
      {primaryLabel && onPrimary && (
        <button
          type="button"
          onClick={onPrimary}
          className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill pressable mb-2"
        >
          {primaryLabel}
        </button>
      )}
      {secondaryLabel && onSecondary && (
        <button
          type="button"
          onClick={onSecondary}
          className="w-full border-2 border-ink text-ink font-bold py-3 rounded-pill pressable"
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  )
}
