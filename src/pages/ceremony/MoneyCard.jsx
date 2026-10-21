import { cn } from '../../lib/utils'
import Bi from './Bi.jsx'
import { LABELS, EXPLAIN_MONEY } from './wizardText.js'
import { rand, randExact } from './format.js'
import { pressable } from './styles.js'

// The one place money is shown. It says plainly where every rand comes from:
// what was paid for items on the list, what was paid for unexpected things,
// and what is still to buy at guide price (which is never taken off).
export default function MoneyCard({ summary, budgetZAR, onEditBudget }) {
  const hasBudget = budgetZAR != null
  const percent = hasBudget && Number(budgetZAR) > 0 ? Math.min(100, Math.round((summary.spent / Number(budgetZAR)) * 100)) : 0
  return (
    <div className={cn('card-paper p-4', summary.overBudget && 'border-2 border-terracotta')}>
      <div className="flex justify-between items-start gap-3">
        <div>
          <div className="text-sm text-ink-muted"><Bi {...LABELS.spent} /></div>
          <p className="font-display font-bold text-3xl text-ink mt-1 tabular">
            {randExact(summary.spent)}
            {hasBudget && <span className="text-sm font-normal text-ink-muted"> / {rand(budgetZAR)}</span>}
          </p>
        </div>
        {onEditBudget && (
          <button type="button" onClick={onEditBudget} className={cn('text-sm text-sage-600 px-2 py-1', pressable)}>
            <Bi {...(hasBudget ? { xh: 'Guqula', en: 'Change budget' } : { xh: 'Beka imali', en: 'Set a budget' })} />
          </button>
        )}
      </div>
      {hasBudget && (
        <div className="w-full h-3 bg-cream-dark rounded-full overflow-hidden mt-3">
          <div className={cn('h-full rounded-full transition-all duration-500', summary.overBudget ? 'bg-terracotta' : 'bg-sage-500')} style={{ width: `${percent}%` }} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <div className="text-xs text-ink-muted"><Bi {...(summary.overBudget ? LABELS.over : LABELS.left)} /></div>
          <p className={cn('font-black text-xl tabular mt-0.5', summary.overBudget ? 'text-terracotta' : 'text-sage-600')}>
            {summary.remaining == null ? '-' : randExact(Math.abs(summary.remaining))}
          </p>
        </div>
        <div>
          <div className="text-xs text-ink-muted"><Bi {...LABELS.stillToBuy} /></div>
          <p className="font-black text-xl tabular text-ink mt-0.5">{randExact(summary.stillToPay)}</p>
        </div>
      </div>
      <p className="text-xs text-ink-muted mt-3">
        {LABELS.onList.en}: <span className="font-bold text-ink">{randExact(summary.onList)}</span>
        {' · '}
        {LABELS.unexpected.en}: <span className="font-bold text-ink">{randExact(summary.unforeseen)}</span>
      </p>
      <p className="text-xs text-ink-muted mt-1 leading-relaxed">
        {EXPLAIN_MONEY}
        {summary.projectedOverBudget && ' At these prices you may go over your budget.'}
      </p>
    </div>
  )
}
