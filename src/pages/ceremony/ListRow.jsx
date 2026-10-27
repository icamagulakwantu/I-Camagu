import Icon from '../../components/Icon.jsx'
import { cn } from '../../lib/utils'
import Bi from './Bi.jsx'
import { BUTTONS, LABELS } from './wizardText.js'
import { rand } from './format.js'
import { pressable, smallInputClass } from './styles.js'

// One line of the shopping list. A guide price is only a hint; the box
// "I paid" is the one number that comes off the budget.
export default function ListRow({ row, showTick = true, busy, onToggle, onSavePrice, onBuy }) {
  if (row.kind === 'note') {
    return <p className="py-3 text-sm font-bold text-terracotta">{row.label}</p>
  }
  const guide = row.suggested != null ? `${rand(row.suggested)} (${row.quantity} x ${rand(row.unitPrice)})` : null
  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        {showTick && (
          <button
            type="button"
            aria-label={row.done ? 'Mark as not done' : 'Mark as done'}
            aria-pressed={row.done}
            disabled={busy}
            onClick={() => onToggle(row)}
            className={cn('w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0', row.done ? 'bg-sage-500 border-sage-500' : 'border-cream-dark bg-white', pressable)}
          >
            {row.done && <Icon name="check" size={18} color="#fff" strokeWidth={2.5} />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('text-base font-medium break-words', row.done ? 'text-ink-muted line-through' : 'text-ink')}>{row.label}</p>
          {guide && <p className="text-xs text-ink-muted mt-0.5">{LABELS.guide.xh} / {LABELS.guide.en}: {guide}</p>}
        </div>
      </div>
      <div className={cn('flex w-full min-w-0 flex-wrap items-center gap-2 mt-2', showTick && 'pl-[52px]')}>
        {row.cost?.skuId && !row.done && (
          <button type="button" onClick={() => onBuy(row.cost)} className={cn('h-11 px-4 rounded-pill bg-terracotta text-white text-sm', pressable)}>
            <Bi {...BUTTONS.buy} enClassName="hidden" />
          </button>
        )}
        <label className="ml-auto flex min-w-0 max-w-full items-center gap-1.5">
          <span className="text-xs text-ink-muted text-right"><Bi {...LABELS.paid} /></span>
          <span className="text-base font-bold text-ink-muted">R</span>
          <input
            key={`${row.key}-${row.actual ?? 'none'}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0"
            defaultValue={row.actual ?? ''}
            disabled={busy}
            onBlur={(e) => onSavePrice(row, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className={cn(smallInputClass, 'w-20 max-w-[28vw] sm:w-24')}
          />
        </label>
      </div>
    </div>
  )
}
