import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { drinksPoolExample, groceryStokvelExample, societyExample, LENDING_RULES } from '../../shared/examples.js'
import { useT } from '../i18n/index.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useLiveExamples } from '../lib/liveExamples.js'

// Worked examples, open to every member and marked "Example" (founder,
// 23 Nov 2026): a full umgidi drinks stokvel buying together, a grocery
// stokvel, a society, and a fully prepared ulwaluko-to-umgidi plan. No real
// group or person; rules from the founder, prices dated and sourced.
const zar = (n) => `R${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const zar0 = (n) => `R${Math.round(Number(n || 0)).toLocaleString('en-ZA')}`

export const EXAMPLES = [
  { id: 'drinks', title: 'Umgidi drinks stokvel', note: '50 members buying together', icon: 'cart' },
  { id: 'grocery', title: 'Grocery stokvel', note: 'Fridge and dry goods, Jan–Nov', icon: 'coins' },
  { id: 'society', title: 'Society', note: 'Money only, your own interest', icon: 'users' },
  { id: 'ceremony', title: 'Ulwaluko to umgidi', note: 'A fully prepared plan', icon: 'calendar' },
]

function Card({ children, className = '' }) {
  return <section className={`rounded-[22px] bg-[#fffdf9] p-4 ring-1 ring-ink/[0.07] shadow-[0_16px_32px_-26px_rgba(43,30,18,0.55)] ${className}`}>{children}</section>
}
function Label({ children }) {
  return <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6f655a]">{children}</p>
}
function Stat({ label, value, tone }) {
  return (
    <div>
      <p className="text-[12px] text-ink-muted">{label}</p>
      <p className={`font-display text-[1.25rem] font-semibold tabular-nums ${tone || 'text-ink'}`}>{value}</p>
    </div>
  )
}
function Rows({ rows }) {
  return (
    <ul className="mt-2 divide-y divide-ink/[0.06]">
      {rows.map((r) => (
        <li key={r.label} className="flex items-baseline justify-between gap-3 py-2 text-[14px]">
          <span className="min-w-0 text-ink">{r.label}</span>
          <span className={`flex-shrink-0 font-semibold tabular-nums ${r.tone || 'text-ink'}`}>{r.value}</span>
        </li>
      ))}
    </ul>
  )
}
function RulesCard({ t, target, interestShared }) {
  return (
    <Card>
      <Label>{t('The rules')}</Label>
      <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-ink">
        <li>• {t('Each member may lend out what they have contributed, less a R100 retainer left with the group.')}</li>
        <li>• {t('They lend to people they know at the interest agreed: here {rate}%.', { rate: Math.round(LENDING_RULES.interestRate * 100) })}</li>
        <li>• {t('The interest comes back to the stokvel, which owns it on paper: it covers bad debts and grows the buying money.')}</li>
        <li>• {t('Each member must raise {target} interest. Whoever falls short pays the difference from their own pocket.', { target: zar0(target) })}</li>
        {interestShared && <li>• {t('The interest is shared equally among the members.')}</li>}
      </ul>
      <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-[12px] leading-relaxed text-ink-muted">
        {t('Lending at interest to people outside the stokvel can fall under the National Credit Act. Check with the National Credit Regulator before your group lends.')}
      </p>
    </Card>
  )
}
function MembersCard({ t, sample, target }) {
  return (
    <Card>
      <Label>{t('Five of the members')}</Label>
      <ul className="mt-2 divide-y divide-ink/[0.06]">
        {sample.map((m) => (
          <li key={m.name} className="py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-semibold text-ink">{m.name}</span>
              <span className={`text-[12px] font-bold ${m.shortfall ? 'text-terracotta-dark' : 'text-[#2e4a2e]'}`}>
                {m.shortfall ? t('Short by {n}: pays it in', { n: zar0(m.shortfall) }) : t('On target')}
              </span>
            </div>
            <p className="text-[12px] text-ink-muted">{t('Paid in {c} · raised {r} interest (target {t})', { c: zar0(m.contributed), r: zar0(m.interestRaised), t: zar0(target) })}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function DrinksExample({ t }) {
  const d = useMemo(() => drinksPoolExample(), [])
  return (
    <div className="space-y-3">
      <Card>
        <Label>{t('The group')}</Label>
        <p className="mt-1 text-[14px] leading-relaxed text-ink">{t('{n} members each save {m} a month for {k} months: {s} each, for the drinks for their own umgidi. They buy together through SmartMatch at bulk prices.', { n: d.members, m: zar0(d.monthly), k: d.months, s: zar0(d.savedPerMember) })}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label={t('Saved by each member')} value={zar0(d.savedPerMember)} />
          <Stat label={t('The group saves')} value={zar0(d.savedPerMember * d.members)} />
        </div>
      </Card>
      <Card>
        <Label>{t('Each member’s drinks (bulk prices, 23 Nov 2026)')}</Label>
        <Rows rows={d.basket.map((b) => ({ label: `${b.cases} × ${b.name} (${b.pack})`, value: zar(b.total) }))} />
        <div className="mt-2 flex items-baseline justify-between border-t border-ink/[0.1] pt-2 text-[15px] font-bold"><span>{t('Each member')}</span><span className="tabular-nums">{zar(d.basketPerMember)}</span></div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{t('Saving alone leaves each member {gap} short. The interest closes the gap: with {i} each, every member takes home the full basket with {left} to spare.', { gap: zar0(d.gapWithoutInterest), i: zar0(d.interestPerMember), left: zar0(d.leftoverPerMember) })}</p>
      </Card>
      <Card>
        <Label>{t('What the group buys together')}</Label>
        <Rows rows={d.pool.map((p) => ({ label: t('{n} cases of {what}', { n: p.cases, what: p.name }), value: zar0(p.total) }))} />
        <div className="mt-2 flex items-baseline justify-between border-t border-ink/[0.1] pt-2 text-[15px] font-bold"><span>{t('One order')}</span><span className="tabular-nums">{zar0(d.poolTotal)}</span></div>
      </Card>
      <RulesCard t={t} target={d.target} interestShared />
      <MembersCard t={t} sample={d.sample} target={d.target} />
    </div>
  )
}

function GroceryExample({ t }) {
  const g = useMemo(() => groceryStokvelExample(), [])
  return (
    <div className="space-y-3">
      <Card>
        <Label>{t('The group')}</Label>
        <p className="mt-1 text-[14px] leading-relaxed text-ink">{t('{n} members each pay {m} a month from January to the end of November: {f} for the fridge and {d} for dry food.', { n: g.members, m: zar0(g.monthly), f: zar0(g.fridgeMonthly), d: zar0(g.dryMonthly) })}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label={t('Paid in by each member')} value={zar0(g.contributed)} />
          <Stat label={t('With the interest')} value={zar0(g.perMember)} tone="text-[#2e4a2e]" />
          <Stat label={t('May lend by June')} value={zar0(g.lendingCapMidYear)} />
          <Stat label={t('The group’s pot')} value={zar0(g.groupPot)} />
        </div>
      </Card>
      <RulesCard t={t} target={g.target} interestShared />
      <Card>
        <Label>{t('Year end: the fridge (Makro Eastern Cape, Nov 2025)')}</Label>
        <Rows rows={g.fridge.map((i) => ({ label: `${i.qty} × ${i.name}`, value: zar(i.total) }))} />
        <div className="mt-2 flex items-baseline justify-between border-t border-ink/[0.1] pt-2 text-[15px] font-bold"><span>{t('Fridge')}</span><span className="tabular-nums">{zar(g.fridgeTotal)}</span></div>
      </Card>
      <Card>
        <Label>{t('Year end: dry goods')}</Label>
        <Rows rows={g.dry.map((i) => ({ label: `${i.qty} × ${i.name}`, value: zar(i.total) }))} />
        <div className="mt-2 flex items-baseline justify-between border-t border-ink/[0.1] pt-2 text-[15px] font-bold"><span>{t('Dry goods')}</span><span className="tabular-nums">{zar(g.dryTotal)}</span></div>
      </Card>
      <Card>
        <Label>{t('What is left: school uniform and stationery')}</Label>
        <p className="mt-1 font-display text-[1.5rem] font-semibold text-[#2e4a2e]">{zar(g.leftover)} <span className="text-[13px] font-normal text-ink-muted">{t('each')}</span></p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{t('Shared out for school uniform and stationery. Each member brings the receipts to show what it was spent on, so the money never goes to alcohol.')}</p>
      </Card>
      <MembersCard t={t} sample={g.sample} target={g.target} />
    </div>
  )
}

function SocietyExample({ t }) {
  const s = useMemo(() => societyExample(), [])
  return (
    <div className="space-y-3">
      <Card>
        <Label>{t('The group')}</Label>
        <p className="mt-1 text-[14px] leading-relaxed text-ink">{t('Money only: each member pays at least {min} a month, with no maximum. Each member lends to raise their own interest. At year end each takes home what they paid in plus the interest they raised themselves.', { min: zar0(s.minimum) })}</p>
      </Card>
      <Card>
        <Label>{t('Five of the members, after {n} months', { n: s.months })}</Label>
        <ul className="mt-2 divide-y divide-ink/[0.06]">
          {s.members.map((m) => (
            <li key={m.name} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold text-ink">{m.name} · {zar0(m.monthly)}{t('/month')}</span>
                <span className="font-bold tabular-nums text-ink">{zar0(m.payout)}</span>
              </div>
              <p className="text-[12px] text-ink-muted">{t('Paid in {c} + own interest {i}', { c: zar0(m.contributed), i: zar0(m.interest) })}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-ink-muted">{t('Unlike a grocery stokvel, there is no shared interest: what you raise is yours.')}</p>
      </Card>
    </div>
  )
}

function CeremonyExample({ t }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [openStage, setOpenStage] = useState(null)
  useEffect(() => {
    fetch('/api/examples/ceremony').then((r) => (r.ok ? r.json() : Promise.reject(new Error('load')))).then(setData).catch(() => setError(t('The example could not load. Please try again.')))
  }, [t])
  if (error) return <p className="text-sm text-terracotta-dark">{error}</p>
  if (!data) return <p className="text-sm text-ink-muted">{t('Loading…')}</p>
  return (
    <div className="space-y-3">
      <Card>
        <Label>{t('Ulwaluko · {g} guests', { g: data.guests })}</Label>
        <p className="mt-1 font-display text-[1.3rem] font-semibold text-ink">{data.title}</p>
        <p className="text-[13px] text-ink-muted">{t('Goes in {a} · umgidi {b}', { a: data.goingIn, b: data.umgidi })}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-dark"><div className="h-full rounded-full bg-[#2e4a2e]" style={{ width: `${(data.done / data.steps) * 100}%` }} /></div>
        <p className="mt-1 text-[12px] text-ink-muted">{t('{done} of {total} done: the day before umgidi', { done: data.done, total: data.steps })}</p>
      </Card>
      <Card>
        <Label>{t('The money')}</Label>
        <Rows rows={[
          { label: t('The plan, at guide prices'), value: zar0(data.money.planGuide) },
          { label: t('What to hire (middle of the range)'), value: zar0(data.money.hireMid) },
          { label: t('Drinks, from the drinks stokvel'), value: zar0(data.money.drinks) },
        ]} />
        <div className="mt-2 flex items-baseline justify-between border-t border-ink/[0.1] pt-2 text-[15px] font-bold"><span>{t('In all')}</span><span className="tabular-nums">{zar0(data.money.total)}</span></div>
        <p className="mt-1 text-[12px] text-ink-muted">{t('Budget {b}: the rest stays for the unforeseen.', { b: zar0(data.budget) })}</p>
      </Card>
      <Card>
        <Label>{t('The journey, stage by stage')}</Label>
        <ul className="mt-2 divide-y divide-ink/[0.06]">
          {data.stages.map((s) => {
            const done = s.rows.filter((r) => r.done).length
            const open = openStage === s.phase
            return (
              <li key={s.phase}>
                <button type="button" onClick={() => setOpenStage(open ? null : s.phase)} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${done === s.rows.length ? 'bg-sage-500 text-white' : 'bg-cream-dark text-ink'}`}>
                    {done === s.rows.length ? <Icon name="check" size={13} color="#fff" /> : <span className="text-[11px] font-bold">{done}</span>}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] font-semibold text-ink">{t(s.title)}</span>
                  {s.guide > 0 && <span className="text-[13px] tabular-nums text-ink-muted">{zar0(s.guide)}</span>}
                  <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#b5ab9f" />
                </button>
                {open && (
                  <ul className="mb-2 ml-9 space-y-1">
                    {s.rows.map((r) => (
                      <li key={r.label} className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className={r.done ? 'text-ink-muted line-through' : 'text-ink'}>{r.label}</span>
                        {r.guide > 0 && <span className="flex-shrink-0 tabular-nums text-ink-muted">{zar0(r.guide)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
      <Card>
        <Label>{t('Who sits where')}</Label>
        <Rows rows={data.seating.map((g) => ({ label: `${g.groupLabel} · ${g.place}`, value: t('{n} people', { n: g.size }) }))} />
      </Card>
      <Card>
        <Label>{t('What was hired')}</Label>
        <Rows rows={data.hire.items.filter((i) => !i.optional).map((i) => ({ label: `${i.tents > 1 ? t('{n} tents with chairs and tables', { n: i.tents }) : i.label} · ${i.vendor.name}`, value: `${zar0(i.low)}–${zar0(i.high)}` }))} />
      </Card>
    </div>
  )
}

// What each worked example opens when you step inside: the real screen, with
// everything in it, that every tab of can be clicked (read-only).
const LIVE = {
  grocery: { type: 'GROCERY_STOKVEL', title: 'Step inside Masibambane Grocery Stokvel', body: '15 members and a whole year: every contribution in the ledger, the fines, loans with their votes and repayments, the lending rounds, minutes, the rules and the statement.' },
  drinks: { type: 'ALCOHOL_BULK_POOL', title: 'Step inside the Umgidi Drinks Pool', body: '50 members saving R1,500 a month: ten months of contributions in the ledger, the interest, fines, minutes and the rules.' },
  ceremony: { ceremony: true, title: 'Step inside Ulwaluko lukaLwazi', body: 'The whole plan, from going to the mountain to umgidi: the shopping list with what is bought, the tasks done, what to hire, seating, who brings what, the family’s pledges and who is coming.' },
}

function StepInside({ t, live, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="mb-4 mt-2 flex w-full items-center gap-3 rounded-[22px] bg-[radial-gradient(120%_120%_at_0%_0%,#14240f_0%,#1f3320_55%,#3c6a37_100%)] p-4 text-left text-cream shadow-[0_18px_34px_-22px_rgba(20,36,15,0.9)]">
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#f5d58a]">{t('Live example · tap every tab')}</span>
        <span className="mt-1 block font-display text-[1.25rem] font-semibold leading-tight">{t(live.title)}</span>
        <span className="mt-1 block text-[13px] leading-snug text-cream/80">{t(live.body)}</span>
      </span>
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#c1922f] text-[#1c1612]"><Icon name="arrowRight" size={18} /></span>
    </button>
  )
}

export default function Examples({ onBack, initialExample = 'drinks', onOpenLiveStokvel, onOpenLiveCeremony }) {
  const t = useT()
  const { accessToken } = useAuth()
  const liveExamples = useLiveExamples(accessToken)
  const [active, setActive] = useState(EXAMPLES.some((e) => e.id === initialExample) ? initialExample : 'drinks')
  useEffect(() => { window.scrollTo({ top: 0 }) }, [active])
  const current = EXAMPLES.find((e) => e.id === active)
  return (
    <div className="min-h-screen bg-cream pb-28">
      <header className="bg-[#1f3320] px-5 pb-6 pt-6 text-cream">
        <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-black/25 px-3 text-sm font-bold">← {t('Back')}</button>
        <span className="inline-block rounded-full bg-[#c1922f] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1c1612]">{t('Example')}</span>
        <h1 className="mt-2 font-display text-[1.9rem] font-semibold leading-tight">{t(current.title)}</h1>
        <p className="mt-1 text-[14px] text-cream/80">{t('A worked example of how it runs when it is fully used. Not a real group or real people.')}</p>
      </header>
      <div className="sticky top-0 z-20 flex gap-2 overflow-x-auto bg-cream/95 px-4 py-2.5 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {EXAMPLES.map((e) => (
          <button key={e.id} type="button" onClick={() => setActive(e.id)} aria-pressed={active === e.id}
            className={`min-h-9 flex-shrink-0 rounded-full px-3.5 text-[13px] font-bold ${active === e.id ? 'bg-[#1f3320] text-cream' : 'border border-ink/10 bg-[#fffdf9] text-ink-muted'}`}>
            {t(e.title)}
          </button>
        ))}
      </div>
      <div className="px-4 pt-2">
        {(() => {
          const live = LIVE[active]
          if (!live) return null
          if (live.ceremony) {
            const c = liveExamples.ceremonies[0]
            return c && onOpenLiveCeremony ? <StepInside t={t} live={live} onOpen={() => onOpenLiveCeremony(c.id)} /> : null
          }
          const s = liveExamples.stokvels.find((x) => x.type === live.type)
          return s && onOpenLiveStokvel ? <StepInside t={t} live={live} onOpen={() => onOpenLiveStokvel(s.id)} /> : null
        })()}
        {active === 'drinks' && <DrinksExample t={t} />}
        {active === 'grocery' && <GroceryExample t={t} />}
        {active === 'society' && <SocietyExample t={t} />}
        {active === 'ceremony' && <CeremonyExample t={t} />}
      </div>
    </div>
  )
}

// A small button that opens an example, for Stokvels, Bulk Buy and Ceremonies.
export function SeeExampleButton({ onClick, label }) {
  const t = useT()
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-[18px] bg-[#fffdf9] px-4 py-3 text-left ring-1 ring-ink/[0.07]">
      <span className="rounded-full bg-[#c1922f] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#1c1612]">{t('Example')}</span>
      <span className="min-w-0 flex-1 text-[14px] font-semibold text-ink">{t(label)}</span>
      <Icon name="chevron-right" size={16} color="#b5ab9f" />
    </button>
  )
}
