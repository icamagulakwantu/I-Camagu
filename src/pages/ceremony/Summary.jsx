import { useState } from 'react'
import CeremonyIcon from '../../components/CeremonyIcon.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { UNFORESEEN_PHASE } from '../../../shared/ceremonyCosts.js'
import { buildListRows, countProgress, summariseRows } from '../../../shared/ceremonyList.js'
import { cn } from '../../lib/utils'
import Bi from './Bi.jsx'
import MoneyCard from './MoneyCard.jsx'
import SummaryActions from './SummaryActions.jsx'
import JourneySteps from './JourneySteps.jsx'
import { sharePlan, wasShared } from './share.js'
import { BUTTONS, LABELS, STEPS } from './wizardText.js'
import { CEREMONY_META, typeName } from './ceremonyMeta.js'
import { planTitle } from './ceremonyForm.js'
import { formatDate, rand } from './format.js'
import { pressable } from './styles.js'

const stepLabel = (id) => STEPS.find((s) => s.id === id)

// Journey colours match Home: terracotta = plan, ochre = money, sage = family.
const COLORS = { plan: '#c45c26', budget: '#c1922f', share: '#4a7a4a', pledges: '#2f6b5a' }

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
  const { showToast } = useToast()
  const [, setSharedTick] = useState(0)
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

  const share = async (viaWhatsApp) => {
    try {
      await sharePlan({ plan, accessToken, viaWhatsApp })
      setSharedTick((n) => n + 1)
    } catch (err) {
      showToast(err.message || 'Could not create the share link', 'error')
    }
  }

  const shared = wasShared(plan)
  const journey = [
    {
      id: 'plan', icon: 'clipboard', color: COLORS.plan, short: 'Plan',
      xh: 'Cwangcisa', en: 'Plan the ceremony',
      status: date ? `${percent}% ready` : 'Add a date',
      done: Boolean(ceremony.eventDate),
      hint: 'Give the ceremony a date so family can plan around it. Your checklist is already waiting.',
      cta: 'Add the date',
      onOpen: () => onEditStep('when'),
    },
    {
      id: 'budget', icon: 'coins', color: COLORS.budget, short: 'Budget',
      xh: 'Imali yakho', en: 'Set your budget',
      status: budgetZAR != null ? rand(budgetZAR) : 'Not set',
      done: budgetZAR != null,
      hint: 'Say how much you can spend. Everything you pay comes off it, so you never overspend.',
      cta: 'Set my budget',
      onOpen: () => onEditStep('money'),
    },
    {
      id: 'share', icon: 'share', color: COLORS.share, short: 'Share',
      xh: 'Yazisa usapho', en: 'Tell your family',
      status: shared ? 'Sent' : 'Not yet',
      done: shared,
      hint: 'Send the plan on WhatsApp. Family see what is still needed and can pledge from the link.',
      cta: 'Share on WhatsApp',
      onOpen: () => share(true),
    },
    {
      id: 'pledges', icon: 'gift', color: COLORS.pledges, short: 'Ukugida',
      xh: 'Ukugida', en: 'Family pledges',
      status: pledges.length ? `${pledges.length} pledged` : 'None yet',
      done: pledges.length > 0,
      hint: 'As family promise goats, drinks or money, they show up here, so you know what is covered.',
      cta: 'See pledges',
      onOpen: onOpenPledges,
    },
  ]

  return (
    <div className="px-4 mt-4 space-y-3">
      <JourneySteps steps={journey} />

      <p className="text-xs text-ink-muted pt-1"><Bi {...LABELS.tapToChange} /></p>

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
        <SummaryActions plan={plan} onShare={share} accessToken={accessToken} onViewTimeline={onViewTimeline} onBookEkoyini={onBookEkoyini} onDeleted={onDeleted} />
      </div>
    </div>
  )
}
