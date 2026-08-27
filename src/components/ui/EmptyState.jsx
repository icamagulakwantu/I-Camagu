import { cn } from '../../lib/utils'

export function EmptyState({ emoji = '📦', proverb, title, description, primaryLabel, onPrimary, secondaryLabel, onSecondary, className }) {
  return (
    <div className={cn('card-paper grain wash-clay overflow-hidden animate-fade-in', className)}>
      <div className="motif-thresholds h-10 w-full opacity-70" />
      <div className="flex flex-col items-center px-6 pb-8 pt-2 text-center">
        <div className="relative -mt-9 flex h-20 w-20 items-center justify-center flex-shrink-0">
          <img src="/icons/source/gateway-mark-1024.png" alt="" className="absolute inset-0 w-20 h-20 object-contain opacity-40" />
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl shadow-soft">
            {emoji}
          </span>
        </div>

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
