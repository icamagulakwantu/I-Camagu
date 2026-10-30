import Icon from '../../components/Icon.jsx'
import { cn } from '../../lib/utils'
import { pressable } from './styles.js'

// The ceremony "map": Plan -> Budget -> Share with family -> Ukugida pledges.
// Every step can be tapped, finished steps get a tick, and the first
// unfinished step is spelled out underneath with one clear button, so a host
// always knows where they are and what to do next.
export default function JourneySteps({ steps }) {
  const nextIndex = steps.findIndex((s) => !s.done)
  const next = nextIndex >= 0 ? steps[nextIndex] : null

  return (
    <section aria-label="Your ceremony journey" className="card-paper p-4">
      <p className="eyebrow text-terracotta">Uhambo lomsitho · Your journey</p>
      <ol className="mt-4 grid grid-cols-4">
        {steps.map((step, i) => {
          const isNext = i === nextIndex
          return (
            <li key={step.id} className="relative flex flex-col items-center">
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-[19px] left-1/2 h-[3px] w-full rounded-full"
                  style={{ backgroundColor: step.done ? step.color : '#e9dfd0' }}
                />
              )}
              <button
                type="button"
                onClick={step.onOpen}
                aria-label={`${step.en}: ${step.status}`}
                className={cn('relative z-10 flex flex-col items-center gap-1.5 px-0.5 text-center', pressable)}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-[#fffdf9] transition-transform',
                    isNext && 'scale-110 shadow-soft',
                  )}
                  style={step.done || isNext
                    ? { backgroundColor: step.color, color: '#ffffff' }
                    : { backgroundColor: '#f3ece1', color: step.color }}
                >
                  {step.done
                    ? <Icon name="check" size={17} color="#ffffff" strokeWidth={2.6} />
                    : <Icon name={step.icon} size={17} />}
                </span>
                <span className="block text-[11px] font-bold leading-tight text-ink">{step.short}</span>
                <span className="block text-[10px] leading-tight text-ink-muted">{step.status}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {next ? (
        <div className="mt-4 rounded-2xl p-3.5" style={{ backgroundColor: `${next.color}14` }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: next.color }}>
            Next · {next.xh}
          </p>
          <p className="mt-0.5 text-sm font-bold text-ink">{next.en}</p>
          <p className="mt-0.5 text-xs leading-snug text-ink-muted">{next.hint}</p>
          <button
            type="button"
            onClick={next.onOpen}
            className={cn('mt-3 flex min-h-11 items-center gap-1.5 rounded-pill px-4 text-sm font-bold text-white', pressable)}
            style={{ backgroundColor: next.color }}
          >
            {next.cta} <Icon name="arrowRight" size={14} color="#ffffff" strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-sage-50 p-3.5">
          <p className="text-sm font-bold text-sage-700">Camagu! Every step is done.</p>
          <p className="mt-0.5 text-xs text-ink-muted">Keep ticking off the list as pledges arrive and items are bought.</p>
        </div>
      )}
    </section>
  )
}
