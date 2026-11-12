import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { UNFORESEEN_PHASE } from '../../../shared/ceremonyCosts.js'
import { buildListRows, countProgress, summariseRows } from '../../../shared/ceremonyList.js'
import { daysUntil, describeCountdown } from '../../lib/countdown.js'
import { ceremonyImage } from '../../data/ceremonyImages.js'
import { CEREMONY_META as STORY } from '../../data/ceremonyTypes.js'
import SummaryActions from './SummaryActions.jsx'
import { sharePlan, wasShared } from './share.js'
import { typeName } from './ceremonyMeta.js'
import { planTitle } from './ceremonyForm.js'
import { rand } from './format.js'

// The ceremony page. Everything about one ceremony lives here: when it is,
// the next thing to do, one picture of the money, the plan and the people,
// and the tools that belong to it (umqombothi, bulk buying, the bar, healers).
// Layered like Home: details rise out of the photo, icon discs break out of
// their tiles, and the money card carries a tab on its top edge.

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// Ceremony dates are stored at UTC midnight, so they are shown in UTC.
const longDate = (iso) => new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const VISIBILITY = { PRIVATE: 'Only you', CLAN_ONLY: 'Your clan', PUBLIC: 'Everyone in the community feed' }

function Eyebrow({ children, tone = 'text-terracotta-dark' }) {
  return <p className={`text-xs font-extrabold uppercase tracking-[0.16em] ${tone}`}>{children}</p>
}

function Chip({ icon, children, strong = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ${strong ? 'bg-ochre-light text-[#1c1612]' : 'border border-cream/25 bg-cream/15 text-cream backdrop-blur-sm'}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}

function GlassButton({ label, icon, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-cream/30 bg-black/30 text-cream backdrop-blur-sm">
      <Icon name={icon} size={18} />
    </button>
  )
}

function Row({ icon, tile, title, detail, onClick }) {
  return (
    <button type="button" onClick={onClick} className="pressable flex w-full items-center gap-3 border-b border-ink/[0.06] px-4 py-3 text-left last:border-b-0">
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] ${tile}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold text-ink">{title}</span>
        <span className="block truncate text-[13px] text-ink-muted">{detail}</span>
      </span>
      <Icon name="arrowRight" size={15} color="#6b645a" />
    </button>
  )
}

export default function CeremonyHome({
  plan, pledges, accessToken, onBack, onEditStep, onOpenPledges, onViewTimeline, onViewBudget,
  onBookEkoyini, onOpenHierarchy, onNavigate, onDeleted,
}) {
  const { showToast } = useToast()
  const [, setSharedTick] = useState(0)
  const ceremony = plan.ceremony || {}
  const type = plan.ceremonyType || ceremony.type
  const title = planTitle(plan)
  const story = STORY[type] || {}

  const budgetZAR = ceremony.budgetZAR != null && ceremony.budgetZAR !== '' ? parseFloat(ceremony.budgetZAR) : null
  const checklistItems = plan.checklistItems || []
  const rows = buildListRows({ costItems: ceremony.costItems || [], checklistItems })
  const summary = summariseRows({ budgetZAR, rows, unforeseenItems: checklistItems.filter((i) => i.phase === UNFORESEEN_PHASE) })
  const { done, total } = countProgress(rows)
  const percent = total ? Math.round((done / total) * 100) : 0
  const days = daysUntil(ceremony.eventDate)
  const pledgedMoney = pledges.reduce((sum, p) => sum + (p.pledgedAmountZAR != null ? parseFloat(p.pledgedAmountZAR) : 0), 0)
  const shared = wasShared(plan)

  const share = async (viaWhatsApp) => {
    try {
      await sharePlan({ plan, accessToken, viaWhatsApp })
      setSharedTick((n) => n + 1)
    } catch (err) {
      showToast(err.message || 'Could not create the share link', 'error')
    }
  }

  // Setting up a ceremony has four steps; the first one not yet done is the
  // single "next" action shown at the top of the page.
  const steps = [
    { id: 'date', short: 'Date', done: Boolean(ceremony.eventDate), eyebrow: 'Next · Usuku', title: 'Give the ceremony a date', text: 'Family plan travel and leave around it. Your checklist is already waiting.', cta: 'Add the date', icon: 'calendar', onClick: () => onEditStep('when') },
    { id: 'budget', short: 'Budget', done: budgetZAR != null, eyebrow: 'Next · Imali', title: 'Set your budget', text: 'Say how much you can spend. Everything you pay comes off it, so you never overspend.', cta: 'Set my budget', icon: 'coins', onClick: () => onEditStep('money') },
    { id: 'share', short: 'Family', done: shared, eyebrow: 'Next · Yazisa usapho', title: 'Tell the family', text: 'Send the plan to the family group. Relatives see what is still needed and pledge from the link, wherever they live.', share: true },
    { id: 'pledges', short: 'Pledges', done: pledges.length > 0, eyebrow: 'Next · Pledges', title: 'Collect the pledges', text: 'As family promise goats, drinks or money, add them here so you know what is covered.', cta: 'Add a pledge', icon: 'gift', onClick: onOpenPledges },
  ]
  const next = steps.find((s) => !s.done)

  // The money picture: everything measured against the budget, in whole rand.
  const expected = summary.projected
  const scale = Math.max(budgetZAR || 0, expected, 1)
  const spentWidth = Math.min(100, (summary.spent / scale) * 100)
  const toComeWidth = Math.min(100 - spentWidth, (Math.max(expected - summary.spent, 0) / scale) * 100)
  const overBy = budgetZAR != null && expected > budgetZAR ? expected - budgetZAR : 0

  return (
    <div className="mx-auto max-w-md pb-32">
      {/* ---------- Hero: the ceremony as an invitation ---------- */}
      <section className="relative h-[460px] overflow-hidden rounded-b-[36px] text-cream">
        <img src={ceremonyImage(type)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,15,11,0.55)_0%,rgba(20,15,11,0)_26%,rgba(20,15,11,0.3)_52%,rgba(20,15,11,0.95)_100%)]" />
        <header className="relative flex items-center justify-between px-5 pt-5">
          <GlassButton label="Back to your ceremonies" icon="arrowLeft" onClick={onBack} />
          <div className="flex gap-2.5">
            <GlassButton label="Share with family" icon="share" onClick={() => share(false)} />
            <GlassButton label="Ceremony details" icon="info" onClick={() => document.getElementById('ceremony-details')?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        </header>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-[76px]">
          <Eyebrow tone="text-ochre-light">{typeName(type)}{story.english ? ` · ${story.english}` : ''}</Eyebrow>
          <h1 className="mt-2 font-display text-[2.5rem] font-semibold leading-[1] tracking-tight text-balance break-words">{title}</h1>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Chip icon="calendar">{ceremony.eventDate ? longDate(ceremony.eventDate) : 'No date yet'}</Chip>
            {ceremony.guestCount != null && <Chip icon="users">{ceremony.guestCount} guests</Chip>}
            {days != null && <Chip strong>{capitalise(describeCountdown(days))}</Chip>}
          </div>
        </div>
      </section>

      {/* ---------- Section bar rising out of the hero ---------- */}
      <nav aria-label="Ceremony sections" className="relative z-10 mx-4 -mt-[52px] grid grid-cols-4 overflow-hidden rounded-[22px] bg-[#fffdf9] shadow-[0_22px_44px_-26px_rgba(43,30,18,0.7)]">
        {[
          { id: 'plan', icon: 'clipboard', label: 'Plan', detail: total ? `${done}/${total}` : 'List', onClick: () => onEditStep('list') },
          { id: 'people', icon: 'users', label: 'People', detail: 'Groups', onClick: () => onOpenHierarchy?.(plan.ceremonyId) },
          { id: 'money', icon: 'coins', label: 'Money', detail: budgetZAR != null ? rand(budgetZAR) : 'Budget', onClick: () => onViewBudget?.(plan.id, title) },
          { id: 'pledges', icon: 'gift', label: 'Pledges', detail: pledges.length ? `${pledges.length}` : 'None yet', onClick: onOpenPledges },
        ].map((item) => (
          <button key={item.id} type="button" onClick={item.onClick} className="pressable flex min-h-[76px] flex-col items-center justify-center gap-1 border-r border-ink/[0.06] px-1 last:border-r-0">
            <Icon name={item.icon} size={18} color="#a3471a" />
            <span className="text-[13px] font-extrabold text-ink">{item.label}</span>
            <span className="max-w-full truncate text-xs tabular-nums text-ink-muted">{item.detail}</span>
          </button>
        ))}
      </nav>

      <div className="mt-6 space-y-5 px-4">
        {/* ---------- Next step ---------- */}
        {next ? (
          <section aria-label="Next step" className="overflow-hidden rounded-[26px] bg-[#1c1612] text-cream">
            <div className="p-5">
              <ol className="mb-4 flex items-center gap-1.5" aria-label="Setting up">
                {steps.map((s) => (
                  <li key={s.id} className="flex flex-1 flex-col gap-1.5">
                    <span className={`h-1 rounded-full ${s.done ? 'bg-ochre-light' : s.id === next.id ? 'bg-cream' : 'bg-cream/20'}`} />
                    <span className={`text-xs font-bold ${s.done ? 'text-ochre-light' : s.id === next.id ? 'text-cream' : 'text-cream/50'}`}>{s.short}</span>
                  </li>
                ))}
              </ol>
              <Eyebrow tone="text-ochre-light">{next.eyebrow}</Eyebrow>
              <h2 className="mt-1 font-display text-[1.5rem] font-semibold leading-tight">{next.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#c9bfb2]">{next.text}</p>
              {next.share ? (
                <div className="mt-4 flex gap-2.5">
                  <button type="button" onClick={() => share(true)} className="pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-cream text-[15px] font-extrabold text-ink">
                    <Icon name="send" size={16} /> Send on WhatsApp
                  </button>
                  <button type="button" onClick={() => share(false)} className="pressable h-12 rounded-full border border-cream/35 px-5 text-[15px] font-bold text-cream">Share</button>
                </div>
              ) : (
                <button type="button" onClick={next.onClick} className="pressable mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cream text-[15px] font-extrabold text-ink">
                  <Icon name={next.icon} size={16} /> {next.cta}
                </button>
              )}
            </div>
          </section>
        ) : (
          <section aria-label="Ready" className="flex items-center gap-3 rounded-[22px] bg-sage-100 px-4 py-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sage-600 text-white"><Icon name="check" size={18} strokeWidth={2.4} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-ink">Set up and shared with the family</span>
              <span className="block text-[13px] text-ink-muted">Keep ticking off the list as things are bought and done.</span>
            </span>
          </section>
        )}

        {/* ---------- The money picture, with a tab on its top edge ---------- */}
        <section aria-label="The money picture" className="pt-4">
          <span className="relative z-10 ml-5 inline-flex items-center gap-2 rounded-t-[14px] bg-[#1c1612] px-4 pb-2 pt-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#d9e4d2]">
            <Icon name="coins" size={13} /> The money picture
          </span>
          <div className="rounded-[24px] rounded-tl-[8px] bg-[#fffdf9] p-5 shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-ink">{budgetZAR != null ? rand(budgetZAR) : 'No budget'}</p>
                <p className="mt-1 text-[13px] text-ink-muted">{budgetZAR != null ? 'Your budget' : 'Set one so everything you pay comes off it'}</p>
              </div>
              <button type="button" onClick={() => onEditStep('money')} className="pressable pb-1 text-sm font-extrabold text-terracotta-dark">{budgetZAR != null ? 'Change' : 'Set budget'}</button>
            </div>

            <div
              role="img"
              aria-label={`Paid ${rand(summary.spent)}. Expected total ${rand(expected)}${budgetZAR != null ? ` against a budget of ${rand(budgetZAR)}` : ''}.`}
              className="mt-4 flex h-3 overflow-hidden rounded-full bg-cream-dark"
            >
              <span className="h-full bg-sage-600" style={{ width: `${spentWidth}%` }} />
              <span className="h-full bg-[repeating-linear-gradient(135deg,#c1922f_0_4px,#e5c98a_4px_8px)]" style={{ width: `${toComeWidth}%` }} />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sage-600" />Paid</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#c1922f]" />Still to buy (guide prices)</span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt className="text-[13px] text-ink-muted">Paid so far</dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">{rand(summary.spent)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-muted">Still to buy</dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">{rand(summary.stillToPay)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-muted">Pledged by family</dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">{rand(pledgedMoney)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-muted">{summary.overBudget ? 'Over budget by' : 'Left in budget'}</dt>
                <dd className={`mt-0.5 text-lg font-extrabold tabular-nums ${summary.overBudget ? 'text-terracotta-dark' : 'text-sage-600'}`}>
                  {summary.remaining == null ? '—' : rand(Math.abs(summary.remaining))}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
              {overBy > 0
                ? `At guide prices this ceremony will cost about ${rand(expected)}, ${rand(overBy)} more than your budget.`
                : `At guide prices this ceremony will cost about ${rand(expected)}. Only what you actually pay comes off your budget.`}
              {summary.unforeseen > 0 && ` Unexpected costs so far: ${rand(summary.unforeseen)}.`}
            </p>
          </div>
        </section>

        {/* ---------- Plan and people: icon discs break out of the tiles ---------- */}
        <section aria-label="Plan and people" className="grid grid-cols-2 gap-3 pt-3">
          <button type="button" onClick={() => onEditStep('list')} className="pressable relative flex min-h-[132px] flex-col justify-end rounded-[22px] bg-[#fffdf9] px-4 pb-3.5 pt-8 text-left shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            <span className="absolute -top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-terracotta-dark text-white ring-4 ring-cream"><Icon name="clipboard" size={18} /></span>
            <span className="font-display text-[1.15rem] font-semibold leading-tight text-ink">The list</span>
            <span className="mt-1 text-[13px] text-ink-muted">{total ? `${done} of ${total} done` : 'Nothing on it yet'}</span>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-cream-dark"><span className="block h-full rounded-full bg-terracotta-dark" style={{ width: `${Math.max(percent, 3)}%` }} /></span>
          </button>
          <button type="button" onClick={() => onOpenHierarchy?.(plan.ceremonyId)} className="pressable relative flex min-h-[132px] flex-col justify-end rounded-[22px] bg-[#fffdf9] px-4 pb-3.5 pt-8 text-left shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            <span className="absolute -top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#c1922f] text-[#1c1612] ring-4 ring-cream"><Icon name="users" size={18} /></span>
            <span className="font-display text-[1.15rem] font-semibold leading-tight text-ink">Who brings what</span>
            <span className="mt-1 text-[13px] text-ink-muted">Give each group its items</span>
          </button>
        </section>

        {/* ---------- Everything for this ceremony ---------- */}
        <section aria-label={`For this ${typeName(type)}`} className="pt-3">
          <Eyebrow>For this {typeName(type).toLowerCase()}</Eyebrow>
          <h2 className="mb-3 mt-0.5 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-ink">Prepare, buy and book</h2>
          <div className="overflow-hidden rounded-[22px] bg-[#fffdf9] shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            <Row icon="cart" tile="bg-[#f3e6cf] text-[#a3471a]" title="Buy in bulk" detail="Livestock, drinks and groceries at group prices" onClick={() => onNavigate?.('store')} />
            <Row icon="beer" tile="bg-sage-100 text-sage-700" title="Brew umqombothi" detail={ceremony.guestCount != null ? `How much to brew for ${ceremony.guestCount} guests` : 'Steps and quantities'} onClick={() => onNavigate?.('umqombothi')} />
            {plan.ceremonyId && <Row icon="cocktail" tile="bg-[#1c1612] text-ochre-light" title="Ekoyini mobile bar" detail="Book a bar for the day" onClick={() => onBookEkoyini?.(plan.ceremonyId, title)} />}
            <Row icon="heartHandshake" tile="bg-[#f6e2d6] text-terracotta-dark" title="Healers, ingcibi & vendors" detail="Trusted traditional help" onClick={() => onNavigate?.('directory')} />
            <Row icon="clock" tile="bg-cream-dark text-ink" title="The day, step by step" detail="What happens, and in what order" onClick={() => onViewTimeline?.(type)} />
          </div>
        </section>

        {/* ---------- Why we hold this ceremony ---------- */}
        {story.desc && (
          <section aria-label={`Why we hold ${typeName(type)}`} className="relative overflow-hidden rounded-[26px] text-cream">
            <img src={ceremonyImage(type)} alt="" className="absolute inset-0 h-full w-full object-cover object-bottom" />
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,15,11,0.45)_0%,rgba(20,15,11,0.9)_70%)]" />
            <div className="relative px-5 pb-5 pt-24">
              <Eyebrow tone="text-ochre-light">Why we hold {typeName(type).toLowerCase()}</Eyebrow>
              <p className="mt-2 font-display text-[1.35rem] font-medium leading-snug">{story.desc}</p>
              <button type="button" onClick={() => onViewTimeline?.(type)} className="pressable mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ochre-light px-4 text-sm font-extrabold text-[#1c1612]">
                See how the day unfolds <Icon name="arrowRight" size={15} />
              </button>
            </div>
          </section>
        )}

        {/* ---------- Details ---------- */}
        <section id="ceremony-details" aria-label="Ceremony details" className="scroll-mt-4 pt-3">
          <Eyebrow>Details</Eyebrow>
          <h2 className="mb-3 mt-0.5 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-ink">About this ceremony</h2>
          <dl className="overflow-hidden rounded-[22px] bg-[#fffdf9] shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            {[
              // The kind is fixed once a ceremony exists, so it has no Change button.
              { id: 'what', label: 'Kind of ceremony', value: typeName(type), fixed: true },
              { id: 'when', label: 'Name and date', value: `${title}${ceremony.eventDate ? ` · ${longDate(ceremony.eventDate)}` : ''}` },
              { id: 'who', label: 'Guests', value: ceremony.guestCount != null ? `${ceremony.guestCount} people` : 'Not set yet' },
              { id: 'money', label: 'Budget', value: budgetZAR != null ? rand(budgetZAR) : 'Not set yet' },
            ].map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-ink/[0.06] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-ink-muted">{item.label}</dt>
                  <dd className="mt-0.5 truncate text-[15px] font-bold text-ink">{item.value}</dd>
                </div>
                {!item.fixed && (
                  <button type="button" onClick={() => onEditStep(item.id)} className="pressable min-h-11 px-2 text-sm font-extrabold text-terracotta-dark">Change</button>
                )}
              </div>
            ))}
            <div className="px-4 py-3">
              <dt className="text-xs text-ink-muted">Who can see it</dt>
              <dd className="mt-0.5 text-[15px] font-bold text-ink">{VISIBILITY[ceremony.visibility] || VISIBILITY.PRIVATE}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <SummaryActions variant="manage" plan={plan} accessToken={accessToken} onShare={share} onDeleted={onDeleted} />
          </div>
        </section>
      </div>
    </div>
  )
}
