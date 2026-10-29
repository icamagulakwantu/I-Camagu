import Icon from '../Icon.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'

// The three things iCamagu helps a family do, in the order the money usually
// flows: save in a stokvel, stretch it through bulk group orders, then spend
// it on the ceremony. Each step shows where the person stands right now, so
// Home works as a map instead of a pile of shortcuts.
export default function JourneyMap({ steps, loading }) {
  return (
    <section className="mb-6" aria-label="Your path">
      <p className="eyebrow text-terracotta">Indlela yakho · Your path</p>
      <h2 className="font-display text-xl font-bold text-ink mb-3">Save, buy together, celebrate</h2>
      <ol className="card-paper overflow-hidden py-1">
        {steps.map((step, i) => (
          <li key={step.id} className="relative">
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[33px] w-0.5"
                style={{ top: 50, bottom: -14, backgroundColor: `${step.color}55` }}
              />
            )}
            <button
              type="button"
              onClick={step.onOpen}
              className="pressable flex w-full items-start gap-3 px-4 py-3.5 text-left"
            >
              <span
                className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                style={{ backgroundColor: step.color }}
              >
                {step.done ? <Icon name="check" size={16} color="#ffffff" strokeWidth={2.5} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest" style={{ color: step.color }}>
                  {step.xhosa}
                </span>
                <span className="block font-bold text-ink text-[15px] leading-tight">{step.title}</span>
                {loading ? (
                  <Skeleton className="mt-1.5 h-3.5 w-40 rounded-pill" />
                ) : (
                  <span className="mt-0.5 block text-xs text-ink-muted leading-snug">{step.status}</span>
                )}
                {!loading && step.progress != null && (
                  <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-pill bg-cream-dark">
                    <span className="block h-full rounded-pill" style={{ width: `${step.progress}%`, backgroundColor: step.color }} />
                  </span>
                )}
              </span>
              <span
                className="self-center flex-shrink-0 rounded-pill px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: step.color }}
              >
                {step.action}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
