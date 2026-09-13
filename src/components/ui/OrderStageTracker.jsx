import { ORDER_STAGES } from '../../data/orderStages.js'

// A plain, explicit progress line for a SmartMatch bulk order — five real
// stages, not a vague "MATCHED" badge. `tone` lets it sit on a dark (ember)
// or light (white card) background.
export function OrderStageTracker({ currentIndex, tone = 'light' }) {
  const isDark = tone === 'dark'
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${ORDER_STAGES.length}, minmax(0, 1fr))` }}>
      {ORDER_STAGES.map((label, i) => {
        const done = i <= currentIndex
        return (
          <div key={label} className="min-w-0">
            <div className={`h-1.5 w-full rounded-pill overflow-hidden ${isDark ? 'bg-white/25' : 'bg-terracotta/15'}`}>
              <div
                className={`h-full rounded-pill transition-all ${done ? (isDark ? 'bg-white' : 'bg-terracotta') : ''}`}
                style={{ width: done ? '100%' : '0%' }}
              />
            </div>
            <p className={`text-[9px] mt-1 leading-tight ${
              i === currentIndex
                ? (isDark ? 'font-bold text-white' : 'font-bold text-terracotta')
                : (isDark ? 'text-white/70' : 'text-ink-muted')
            }`}>
              {label}
            </p>
          </div>
        )
      })}
    </div>
  )
}
