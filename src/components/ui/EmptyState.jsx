import { cn } from '../../lib/utils'

export function EmptyState({ emoji = '📦', proverb, title, description, primaryLabel, onPrimary, secondaryLabel, onSecondary, className }) {
  return (
    <div className={cn('card-paper grain wash-clay overflow-hidden animate-fade-in', className)}>
      <div className="flex flex-col items-center px-6 py-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-soft flex-shrink-0">
          {emoji}
        </span>

        {proverb && (
          <>
            <p className="mt-4 font-display text-[13px] italic text-ink-muted">{proverb}</p>
            <div className="mx-auto mt-3 h-px w-10 bg-brand-ochre/50" />
          </>
        )}

        <h3 className={cn('font-display font-bold text-xl text-ink mb-2', proverb ? 'mt-3' : 'mt-4')}>{title}</h3>
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
            className="w-full border-2 border-terracotta/25 text-ink font-bold py-3 rounded-pill pressable"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}
