import CeremonyIcon from '../../components/CeremonyIcon.jsx'
import { UNFORESEEN_PHASE } from '../../../shared/ceremonyCosts.js'
import { buildListRows, countProgress, summariseRows } from '../../../shared/ceremonyList.js'
import { cn } from '../../lib/utils'
import Bi from './Bi.jsx'
import MoneyCard from './MoneyCard.jsx'
import SummaryActions from './SummaryActions.jsx'
import { BUTTONS, LABELS, STEPS } from './wizardText.js'
import { CEREMONY_META, typeName } from './ceremonyMeta.js'
import { planTitle } from './ceremonyForm.js'
import { formatDate, rand } from './format.js'
import { pressable } from './styles.js'

const stepLabel = (id) => STEPS.find((s) => s.id === id)

// Every section is one big tap that jumps straight back to its step.
function SectionCard({ label, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={cn('w-full text-left card-paper p-4 flex items-start gap-3', pressable)}>
      <span className="flex-1 min-w-0">
        <span className="block text-xs text-ink-muted"><Bi {...label} /></span>
        <span className="block mt-1.5">{children}</span>
      </span>
      <span className="text-xs text-terracotta flex-shrink-0 pt-0.5"><Bi {...BUTTONS.change} /></span>
    </button>
  )
}

export default function Summary({ plan, pledges, accessToken, onEditStep, onOpenPledges, onViewTimeline, onBookEkoyini, onDeleted }) {
  const ceremony = plan.ceremony || {}
  const budgetZAR = ceremony.budgetZAR != null && ceremony.budgetZAR !== '' ? parseFloat(ceremony.budgetZAR) : null
  const checklistItems = plan.checklistItems || []
  const rows = buildListRows({ costItems: ceremony.costItems || [], checklistItems })
  const summary = summariseRows({
    budgetZAR,
    rows,
    unforeseenItems: checklistItems.filter((i) => i.phase === UNFORESEEN_PHASE),
  })
  const { done, total } = countProgress(rows)
  const percent = total ? Math.round((done / total) * 100) : 0
  const type = plan.ceremonyType || ceremony.type
  const date = formatDate(ceremony.eventDate)
  const totalPledged = pledges.reduce((sum, p) => sum + (p.pledgedAmountZAR != null ? parseFloat(p.pledgedAmountZAR) : 0), 0)

  return (
    <div className="px-4 mt-4 space-y-3">
      <p className="text-xs text-ink-muted"><Bi {...LABELS.tapToChange} /></p>

      <SectionCard label={stepLabel('what')} onClick={() => onEditStep('what')}>
        <span className="flex items-center gap-3">
          <CeremonyIcon type={type} size={44} />
          <span>
            <span className="block text-base font-bold text-ink">{typeName(type)}</span>
            <span className="block text-xs text-ink-muted">{CEREMONY_META[type]?.desc}</span>
          </span>
        </span>
      </SectionCard>

      <SectionCard label={stepLabel('when')} onClick={() => onEditStep('when')}>
        <span className="block text-base font-bold text-ink break-words">{planTitle(plan)}</span>
        <span className="block text-sm text-ink-muted">{date || 'No date yet'}</span>
      </SectionCard>

      <SectionCard label={stepLabel('who')} onClick={() => onEditStep('who')}>
        <span className="block text-base font-bold text-ink">{ceremony.guestCount != null ? `${ceremony.guestCount} people` : 'Not set yet'}</span>
      </SectionCard>

      <SectionCard label={stepLabel('money')} onClick={() => onEditStep('money')}>
        <span className="block text-base font-bold text-ink">{budgetZAR != null ? rand(budgetZAR) : 'No budget yet'}</span>
      </SectionCard>

      <MoneyCard summary={summary} budgetZAR={budgetZAR} />

      <SectionCard label={stepLabel('list')} onClick={() => onEditStep('list')}>
        <span className="block text-base font-bold text-ink">{done} / {total} done</span>
        <span className="block w-full h-3 bg-cream-dark rounded-full overflow-hidden mt-2">
          <span className="block h-full bg-terracotta rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
        </span>
      </SectionCard>

      <SectionCard label={LABELS.family} onClick={onOpenPledges}>
        <span className="block text-base font-bold text-ink">
          {pledges.length === 0 ? 'No pledges yet' : `${pledges.length} pledge${pledges.length === 1 ? '' : 's'} · ${rand(totalPledged)}`}
        </span>
      </SectionCard>

      <div className="pt-2">
        <SummaryActions plan={plan} accessToken={accessToken} onViewTimeline={onViewTimeline} onBookEkoyini={onBookEkoyini} onDeleted={onDeleted} />
      </div>
    </div>
  )
}
