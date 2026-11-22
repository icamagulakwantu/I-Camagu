import { useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { UNFORESEEN_PHASE } from '../../../shared/ceremonyCosts.js'
import { buildListRows, countProgress, summariseRows } from '../../../shared/ceremonyList.js'
import { daysUntil, describeCountdown, focusDate } from '../../lib/countdown.js'
import { ceremonyImage } from '../../data/ceremonyImages.js'
import { CEREMONY_META as STORY } from '../../data/ceremonyTypes.js'
import SummaryActions from './SummaryActions.jsx'
import ConnectedCard from './ConnectedCard.jsx'
import TemplateShareCard from '../templates/TemplateShareCard.jsx'
import ProposalReview from '../templates/ProposalReview.jsx'
import { PLAN_API } from '../templates/collabApi.js'
import { planDocumentHtml, printHtml } from '../../lib/printDoc.js'
import ComingUp from './ComingUp.jsx'
import MothersGuide from './MothersGuide.jsx'
import { sharePlan, wasShared } from './share.js'
import { typeName } from './ceremonyMeta.js'
import { planTitle } from './ceremonyForm.js'
import { rand } from './format.js'
import { request } from './api.js'
import { phaseLabel } from '../../../shared/ceremonyList.js'
import { DateText, formatDate, useLanguage, useT } from '../../i18n/index.jsx'

// The ceremony page. Everything about one ceremony lives here: when it is,
// the next thing to do, one picture of the money, the plan and the people,
// and the tools that belong to it (umqombothi, bulk buying, the bar, healers).
// Layered like Home: details rise out of the photo, icon discs break out of
// their tiles, and the money card carries a tab on its top edge.

const longDate = (lang, iso) => formatDate(lang, iso, { year: true, utc: true })
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// Ceremony dates are stored at UTC midnight, so they are shown in UTC.

const VISIBILITY = { PRIVATE: 'Only you', CLAN_ONLY: 'Your clan', PUBLIC: 'Everyone in the community feed' }

// What family have suggested through the shared link. Nothing reaches the
// plan until the host taps Add; Dismiss removes it. The link itself never
// gives anyone access to the host's account.
function FamilySuggestions({ planId, accessToken, onAccepted }) {
  const t = useT()
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!planId) return
    request(`/api/ceremonies/plans/${planId}/suggestions`, accessToken)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
  }, [planId, accessToken])

  const act = async (item, action) => {
    setBusy(item.id)
    try {
      await request(`/api/ceremonies/plans/suggestions/${item.id}/${action}`, accessToken, { method: 'POST' })
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      if (action === 'accept') {
        showToast(t('Added "{label}" to the plan', { label: item.label }), 'success')
        onAccepted?.()
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  if (items.length === 0) return null
  return (
    <section aria-label={t('Family suggestions')} className="rounded-[24px] bg-[#fffdf9] p-5 shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">Iingcebiso · From the family</p>
      <h2 className="mt-1 font-display text-[1.3rem] font-semibold leading-tight text-ink">{items.length === 1 ? t('1 suggestion for you') : t('{n} suggestions for you', { n: items.length })}</h2>
      <p className="mt-1 text-[13px] text-ink-muted">{t('Sent from the link you shared. Add what belongs in the plan.')}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-[18px] border border-ink/[0.06] bg-white p-3.5">
            <p className="text-[15px] font-bold text-ink">{item.label}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {[item.suggestedBy || t('Someone in the family'), item.phase ? phaseLabel(item.phase) : null].filter(Boolean).join(' · ')}
            </p>
            {item.note && <p className="mt-1 text-[13px] text-ink">{item.note}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy === item.id} onClick={() => act(item, 'accept')} className="pressable h-10 flex-1 rounded-full bg-terracotta text-sm font-bold text-white disabled:opacity-60">{t('Add to plan')}</button>
              <button type="button" disabled={busy === item.id} onClick={() => act(item, 'dismiss')} className="pressable h-10 rounded-full bg-cream-dark px-4 text-sm font-bold text-ink disabled:opacity-60">{t('Dismiss')}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Eyebrow({ children, tone = 'text-[#6f655a]' }) {
  return <p className={`text-xs font-extrabold uppercase tracking-[0.16em] ${tone}`}>{children}</p>
}

function Chip({ icon, children, strong = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ${strong ? 'bg-cream text-[#1f3320]' : 'border border-cream/25 bg-cream/15 text-cream backdrop-blur-sm'}`}>
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
  onBookEkoyini, onOpenHierarchy, onNavigate, onDeleted, onPlanChanged,
}) {
  const t = useT()
  const { lang } = useLanguage()
  const { showToast } = useToast()
  const [, setSharedTick] = useState(0)
  // A suggestion from someone helping plan, open for review.
  const [reviewing, setReviewing] = useState(null)
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
  const focus = focusDate(ceremony)
  const days = daysUntil(focus.date)
  const pledgedMoney = pledges.reduce((sum, p) => sum + (p.pledgedAmountZAR != null ? parseFloat(p.pledgedAmountZAR) : 0), 0)
  const shared = wasShared(plan)

  const share = async (viaWhatsApp) => {
    try {
      await sharePlan({ plan, accessToken, viaWhatsApp })
      setSharedTick((n) => n + 1)
    } catch (err) {
      showToast(err.message || t('Could not create the share link'), 'error')
    }
  }

  // Setting up a ceremony has four steps; the first one not yet done is the
  // single "next" action shown at the top of the page.
  const steps = [
    { id: 'date', short: t('Date'), done: Boolean(ceremony.eventDate), eyebrow: t('Next · Usuku'), title: t('Give the ceremony a date'), text: t('Family plan travel and leave around it. Your checklist is already waiting.'), cta: t('Add the date'), icon: 'calendar', onClick: () => onEditStep('when') },
    { id: 'budget', short: t('Budget'), done: budgetZAR != null, eyebrow: t('Next · Imali'), title: t('Set your budget'), text: t('Say how much you can spend. Everything you pay comes off it, so you never overspend.'), cta: t('Set my budget'), icon: 'coins', onClick: () => onEditStep('money') },
    { id: 'share', short: t('Family'), done: shared, eyebrow: t('Next · Yazisa usapho'), title: t('Tell the family'), text: t('Send the plan to the family group. Relatives see what is still needed and pledge from the link, wherever they live.'), share: true },
    { id: 'pledges', short: t('Pledges'), done: pledges.length > 0, eyebrow: t('Next · Pledges'), title: t('Collect the pledges'), text: t('As family promise goats, drinks or money, add them here so you know what is covered.'), cta: t('Add a pledge'), icon: 'gift', onClick: onOpenPledges },
  ]
  const next = steps.find((s) => !s.done)

  // The money picture: everything measured against the budget, in whole rand.
  const expected = summary.projected
  const scale = Math.max(budgetZAR || 0, expected, 1)
  const spentWidth = Math.min(100, (summary.spent / scale) * 100)
  const toComeWidth = Math.min(100 - spentWidth, (Math.max(expected - summary.spent, 0) / scale) * 100)
  const overBy = budgetZAR != null && expected > budgetZAR ? expected - budgetZAR : 0

  if (reviewing) {
    return <ProposalReview api={PLAN_API} templateId={ceremony.id} proposalId={reviewing} onBack={() => setReviewing(null)} onDone={() => { setReviewing(null); onPlanChanged?.() }} />
  }

  return (
    <div className="mx-auto max-w-md pb-32">
      {/* ---------- Hero: the ceremony as an invitation ---------- */}
      <section className="relative h-[460px] overflow-hidden rounded-b-[36px] text-cream">
        <img src={ceremonyImage(type)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,15,11,0.55)_0%,rgba(20,15,11,0)_26%,rgba(20,15,11,0.3)_52%,rgba(20,15,11,0.95)_100%)]" />
        <header className="relative flex items-center justify-between px-5 pt-5">
          <GlassButton label={t('Back to your ceremonies')} icon="arrowLeft" onClick={onBack} />
          <div className="flex gap-2.5">
            <GlassButton label={t('Share with family')} icon="share" onClick={() => share(false)} />
            <GlassButton label={t('Ceremony details')} icon="info" onClick={() => document.getElementById('ceremony-details')?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        </header>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-[76px]">
          <Eyebrow tone="text-cream/60">{t(typeName(type))}{story.english && lang !== 'xh' ? ` · ${story.english}` : ''}</Eyebrow>
          <h1 className="mt-2 font-display text-[2.5rem] font-semibold leading-[1] tracking-tight text-balance break-words">{title}</h1>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Chip icon="calendar">{ceremony.eventDate ? <DateText value={ceremony.eventDate} year utc /> : t('No date yet')}</Chip>
            {ceremony.homecomingDate && <Chip icon="home">Umgidi <DateText value={ceremony.homecomingDate} year utc /></Chip>}
            {ceremony.guestCount != null && <Chip icon="users">{t('{n} guests', { n: ceremony.guestCount })}</Chip>}
            {days != null && <Chip strong>{focus.isHomecoming ? `Umgidi ${t(describeCountdown(days))}` : t(capitalise(describeCountdown(days)))}</Chip>}
          </div>
        </div>
      </section>

      {/* ---------- Section bar rising out of the hero ---------- */}
      <nav aria-label={t('Ceremony sections')} className="relative z-10 mx-4 -mt-[52px] grid grid-cols-4 overflow-hidden rounded-[22px] bg-[#fffdf9] shadow-[0_22px_44px_-26px_rgba(43,30,18,0.7)]">
        {[
          { id: 'plan', icon: 'clipboard', label: t('Plan'), detail: total ? `${done}/${total}` : t('List'), onClick: () => onEditStep('list') },
          { id: 'people', icon: 'users', label: t('People'), detail: t('Groups'), onClick: () => onOpenHierarchy?.(plan.ceremonyId) },
          { id: 'money', icon: 'coins', label: t('Money'), detail: budgetZAR != null ? rand(budgetZAR) : t('Budget'), onClick: () => onViewBudget?.(plan.id, title) },
          { id: 'pledges', icon: 'gift', label: t('Pledges'), detail: pledges.length ? `${pledges.length}` : t('None yet'), onClick: onOpenPledges },
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
          <section aria-label={t('Next step')} className="overflow-hidden rounded-[26px] bg-[#1f3320] text-cream">
            <div className="p-5">
              <ol className="mb-4 flex items-center gap-1.5" aria-label={t('Setting up')}>
                {steps.map((s) => (
                  <li key={s.id} className="flex flex-1 flex-col gap-1.5">
                    <span className={`h-1 rounded-full ${s.done ? 'bg-ochre-light' : s.id === next.id ? 'bg-cream' : 'bg-cream/20'}`} />
                    <span className={`text-xs font-bold ${s.done ? 'text-ochre-light' : s.id === next.id ? 'text-cream' : 'text-cream/50'}`}>{s.short}</span>
                  </li>
                ))}
              </ol>
              <Eyebrow tone="text-cream/60">{next.eyebrow}</Eyebrow>
              <h2 className="mt-1 font-display text-[1.5rem] font-semibold leading-tight">{next.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#c9bfb2]">{next.text}</p>
              {next.share ? (
                <div className="mt-4 flex gap-2.5">
                  <button type="button" onClick={() => share(true)} className="pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-cream text-[15px] font-extrabold text-ink">
                    <Icon name="send" size={16} /> {t('Send on WhatsApp')}
                  </button>
                  <button type="button" onClick={() => share(false)} className="pressable h-12 rounded-full border border-cream/35 px-5 text-[15px] font-bold text-cream">{t('Share')}</button>
                </div>
              ) : (
                <button type="button" onClick={next.onClick} className="pressable mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cream text-[15px] font-extrabold text-ink">
                  <Icon name={next.icon} size={16} /> {next.cta}
                </button>
              )}
            </div>
          </section>
        ) : (
          <section aria-label={t('Ready')} className="flex items-center gap-3 rounded-[22px] bg-sage-100 px-4 py-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sage-600 text-white"><Icon name="check" size={18} strokeWidth={2.4} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-ink">{t('Set up and shared with the family')}</span>
              <span className="block text-[13px] text-ink-muted">{t('Keep ticking off the list as things are bought and done.')}</span>
            </span>
          </section>
        )}

        <FamilySuggestions planId={plan.id} accessToken={accessToken} onAccepted={onPlanChanged} />

        <ComingUp rows={rows} ceremony={{ ...ceremony, type }} onOpenList={() => onEditStep('list')} />

        {type === 'ULWALUKO' && <MothersGuide onOpenUmqombothi={() => onNavigate?.('umqombothi')} />}

        {/* ---------- The money picture, with a tab on its top edge ---------- */}
        <section aria-label={t('The money picture')} className="pt-4">
          <span className="relative z-10 ml-5 inline-flex items-center gap-2 rounded-t-[14px] bg-[#2e4a2e] px-4 pb-2 pt-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#d9e4d2]">
            <Icon name="coins" size={13} /> {t('The money picture')}
          </span>
          <div className="rounded-[24px] rounded-tl-[8px] bg-[#fffdf9] p-5 shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-ink">{budgetZAR != null ? rand(budgetZAR) : t('No budget')}</p>
                <p className="mt-1 text-[13px] text-ink-muted">{budgetZAR != null ? t('Your budget') : t('Set one so everything you pay comes off it')}</p>
              </div>
              <button type="button" onClick={() => onEditStep('money')} className="pressable pb-1 text-sm font-extrabold text-terracotta-dark">{budgetZAR != null ? t('Change') : t('Set budget')}</button>
            </div>

            <div
              role="img"
              aria-label={t('Paid {paid}. Expected total {total}.', { paid: rand(summary.spent), total: rand(expected) })}
              className="mt-4 flex h-3 overflow-hidden rounded-full bg-cream-dark"
            >
              <span className="h-full bg-sage-600" style={{ width: `${spentWidth}%` }} />
              <span className="h-full bg-[repeating-linear-gradient(135deg,#c1922f_0_4px,#e5c98a_4px_8px)]" style={{ width: `${toComeWidth}%` }} />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sage-600" />{t('Paid')}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#c1922f]" />{t('Still to buy (guide prices)')}</span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt className="text-[13px] text-ink-muted">{t('Paid so far')}</dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">{rand(summary.spent)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-muted">{t('Still to buy')}</dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">{rand(summary.stillToPay)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-muted">{t('Pledged by family')}</dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">{rand(pledgedMoney)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-muted">{summary.overBudget ? t('Over budget by') : t('Left in budget')}</dt>
                <dd className={`mt-0.5 text-lg font-extrabold tabular-nums ${summary.overBudget ? 'text-terracotta-dark' : 'text-sage-600'}`}>
                  {summary.remaining == null ? '—' : rand(Math.abs(summary.remaining))}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
              {overBy > 0
                ? t('At guide prices this ceremony will cost about {total}, {over} more than your budget.', { total: rand(expected), over: rand(overBy) })
                : t('At guide prices this ceremony will cost about {total}. Only what you actually pay comes off your budget.', { total: rand(expected) })}
              {summary.unforeseen > 0 && ` ${t('Unexpected costs so far: {amount}.', { amount: rand(summary.unforeseen) })}`}
            </p>
          </div>
        </section>

        {/* ---------- Plan and people: icon discs break out of the tiles ---------- */}
        <section aria-label={t('Plan and people')} className="grid grid-cols-2 gap-3 pt-3">
          <button type="button" onClick={() => onEditStep('list')} className="pressable relative flex min-h-[132px] flex-col justify-end rounded-[22px] bg-[#fffdf9] px-4 pb-3.5 pt-8 text-left shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            <span className="absolute -top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-terracotta-dark text-white ring-4 ring-cream"><Icon name="clipboard" size={18} /></span>
            <span className="font-display text-[1.15rem] font-semibold leading-tight text-ink">{t('The list')}</span>
            <span className="mt-1 text-[13px] text-ink-muted">{total ? t('{done} of {total} done', { done, total }) : t('Nothing on it yet')}</span>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-cream-dark"><span className="block h-full rounded-full bg-terracotta-dark" style={{ width: `${Math.max(percent, 3)}%` }} /></span>
          </button>
          <button type="button" onClick={() => onOpenHierarchy?.(plan.ceremonyId)} className="pressable relative flex min-h-[132px] flex-col justify-end rounded-[22px] bg-[#fffdf9] px-4 pb-3.5 pt-8 text-left shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            <span className="absolute -top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#c1922f] text-[#1c1612] ring-4 ring-cream"><Icon name="users" size={18} /></span>
            <span className="font-display text-[1.15rem] font-semibold leading-tight text-ink">{t('Who brings what')}</span>
            <span className="mt-1 text-[13px] text-ink-muted">{t('Give each group its items')}</span>
          </button>
        </section>

        <ConnectedCard ceremony={ceremony} title={title} accessToken={accessToken} onNavigate={onNavigate} onChanged={onPlanChanged} showToast={showToast} />

        {/* Family help plan: their suggestions wait for the host's approval. */}
        {ceremony.id && <TemplateShareCard api={PLAN_API} template={{ id: ceremony.id, title }} onReview={setReviewing} />}

        {/* ---------- Everything for this ceremony ---------- */}
        <section aria-label={`For this ${typeName(type)}`} className="pt-3">
          <Eyebrow>For this {typeName(type).toLowerCase()}</Eyebrow>
          <h2 className="mb-3 mt-0.5 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-ink">{t('Prepare, buy and book')}</h2>
          <div className="overflow-hidden rounded-[22px] bg-[#fffdf9] shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            <Row icon="drumstick" tile="bg-[#f6e2d6] text-terracotta-dark" title={t('Feast calculator')} detail={ceremony.guestCount != null ? t('Meat, samp and vegetables for {n} guests', { n: ceremony.guestCount }) : t('Meat, samp and vegetables, and the cost')} onClick={() => onNavigate?.('isidlo')} />
            <Row icon="beer" tile="bg-sage-100 text-sage-700" title={t('Brew umqombothi')} detail={ceremony.guestCount != null ? t('How much to brew for {n} guests', { n: ceremony.guestCount }) : t('Steps and quantities')} onClick={() => onNavigate?.('umqombothi')} />
            {plan.ceremonyId && <Row icon="cocktail" tile="bg-[#1f3320] text-ochre-light" title={t('Ekoyini mobile bar')} detail={t('Book a bar for the day')} onClick={() => onBookEkoyini?.(plan.ceremonyId, title)} />}
            <Row icon="heartHandshake" tile="bg-[#f6e2d6] text-terracotta-dark" title={t('Healers, ingcibi & vendors')} detail={t('Trusted traditional help')} onClick={() => onNavigate?.('directory')} />
            <Row icon="clock" tile="bg-cream-dark text-ink" title={t('The day, step by step')} detail={t('What happens, and in what order')} onClick={() => onViewTimeline?.(type)} />
          </div>
        </section>

        {/* ---------- Why we hold this ceremony ---------- */}
        {story.desc && (
          <section aria-label={`Why we hold ${typeName(type)}`} className="relative overflow-hidden rounded-[26px] text-cream">
            <img src={ceremonyImage(type)} alt="" className="absolute inset-0 h-full w-full object-cover object-bottom" />
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,15,11,0.45)_0%,rgba(20,15,11,0.9)_70%)]" />
            <div className="relative px-5 pb-5 pt-24">
              <Eyebrow tone="text-cream/60">Why we hold {typeName(type).toLowerCase()}</Eyebrow>
              <p className="mt-2 font-display text-[1.35rem] font-medium leading-snug">{story.desc}</p>
              <button type="button" onClick={() => onViewTimeline?.(type)} className="pressable mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-cream px-4 text-sm font-extrabold text-[#1f3320]">
                See how the day unfolds <Icon name="arrowRight" size={15} />
              </button>
            </div>
          </section>
        )}

        {/* ---------- Details ---------- */}
        <section id="ceremony-details" aria-label={t('Ceremony details')} className="scroll-mt-4 pt-3">
          <Eyebrow>{t('Details')}</Eyebrow>
          <h2 className="mb-3 mt-0.5 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-ink">{t('About this ceremony')}</h2>
          <dl className="overflow-hidden rounded-[22px] bg-[#fffdf9] shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
            {[
              // The kind is fixed once a ceremony exists, so it has no Change button.
              { id: 'what', label: t('Kind of ceremony'), value: typeName(type), fixed: true },
              { id: 'when', label: t('Name and date'), value: `${title}${ceremony.eventDate ? ` · ${longDate(lang, ceremony.eventDate)}` : ''}${ceremony.homecomingDate ? ` · Umgidi ${longDate(lang, ceremony.homecomingDate)}` : ''}` },
              { id: 'who', label: t('Guests'), value: ceremony.guestCount != null ? t('{n} people', { n: ceremony.guestCount }) : t('Not set yet') },
              { id: 'money', label: t('Budget'), value: budgetZAR != null ? rand(budgetZAR) : t('Not set yet') },
            ].map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-ink/[0.06] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-ink-muted">{item.label}</dt>
                  <dd className="mt-0.5 truncate text-[15px] font-bold text-ink">{item.value}</dd>
                </div>
                {!item.fixed && (
                  <button type="button" onClick={() => onEditStep(item.id)} className="pressable min-h-11 px-2 text-sm font-extrabold text-terracotta-dark">{t('Change')}</button>
                )}
              </div>
            ))}
            <div className="px-4 py-3">
              <dt className="text-xs text-ink-muted">{t('Who can see it')}</dt>
              <dd className="mt-0.5 text-[15px] font-bold text-ink">{t(VISIBILITY[ceremony.visibility] || VISIBILITY.PRIVATE)}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <SummaryActions variant="manage" plan={plan} accessToken={accessToken} onShare={share} onDeleted={onDeleted} onDownloadPdf={() => printHtml(planDocumentHtml({ title, typeName: typeName(type), ceremony, rows, summary }))} />
          </div>
        </section>
      </div>
    </div>
  )
}
