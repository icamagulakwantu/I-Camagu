import Icon from '../Icon.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'

// The three things iCamagu helps a family do, in the order the money usually
// flows: save in a stokvel, stretch it through bulk group orders, then spend
// it on the ceremony. Each step shows where the person stands right now, and
// the first unfinished step is highlighted as "Next" so Home always answers
// "what should I do now?".
export default function JourneyMap({ steps, loading }) {
  const nextIndex = steps.findIndex((s) => !s.done)

  return (
    <section className="mb-8" aria-label="Your path">
      <p className="eyebrow text-terracotta">Indlela yakho · Your path</p>
      <h2 className="font-display text-[1.4rem] font-semibold leading-tight text-ink mb-3">Save, buy together, celebrate</h2>
      <ol className="card-paper overflow-hidden py-1.5">
        {steps.map((step, i) => {
          const isNext = !loading && i === nextIndex
          return (
            <li key={step.id} className="relative">
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[37px] w-px"
                  style={{ top: 56, bottom: -16, backgroundImage: `repeating-linear-gradient(to bottom, ${step.color} 0 3px, transparent 3px 7px)` }}
                />
              )}
              <button
                type="button"
                onClick={step.onOpen}
                className={`pressable relative flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors ${isNext ? 'bg-cream/70' : ''}`}
              >
                {isNext && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ backgroundColor: step.color }} />}
                <span
                  className="relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-display text-base font-semibold text-white ring-4 ring-[#fffdf9]"
                  style={{ backgroundColor: step.color }}
                >
                  {step.done ? <Icon name="check" size={18} color="#ffffff" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="flex items-center gap-2">
                    <span className="block text-[10px] font-extrabold uppercase tracking-widest" style={{ color: step.color }}>
                      {step.xhosa}
                    </span>
                    {isNext && (
                      <span className="rounded-pill px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: step.color }}>
                        Next
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block font-display text-[17px] font-semibold leading-tight text-ink">{step.title}</span>
                  {loading ? (
                    <Skeleton className="mt-1.5 h-3.5 w-40 rounded-pill" />
                  ) : (
                    <span className="mt-1 block text-xs text-ink-muted leading-snug">{step.status}</span>
                  )}
                  {!loading && step.progress != null && (
                    <span className="mt-2.5 block h-1.5 w-full overflow-hidden rounded-pill bg-cream-dark">
                      <span className="block h-full rounded-pill transition-all duration-700" style={{ width: `${step.progress}%`, backgroundColor: step.color }} />
                    </span>
                  )}
                </span>
                <span
                  className="self-center flex flex-shrink-0 items-center gap-1 rounded-pill px-3 py-1.5 text-xs font-bold"
                  style={isNext
                    ? { backgroundColor: step.color, color: '#ffffff' }
                    : { backgroundColor: `${step.color}17`, color: step.color }}
                >
                  {step.action}
                  <Icon name="arrowRight" size={12} color={isNext ? '#ffffff' : step.color} strokeWidth={2.2} />
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
