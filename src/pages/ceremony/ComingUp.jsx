import Icon from '../../components/Icon.jsx'
import { comingUp, describeDue } from '../../../shared/ceremonyTiming.js'
import { phaseLabel } from '../../../shared/ceremonyList.js'
import { DateText, useT } from '../../i18n/index.jsx'


// What to do next, by date, like a wedding planner's "this week" list. The
// dates are aims worked out from the ceremony date; only registration for
// ulwaluko is a legal deadline.
export default function ComingUp({ rows, ceremony, onOpenList }) {
  const t = useT()
  if (!ceremony?.eventDate) return null
  const all = comingUp(rows, ceremony, { limit: 50 })
  if (all.length === 0) return null
  // Four at a time, as slim rows: the next things, not the whole plan.
  const list = all.slice(0, 4)
  const more = all.length - list.length
  return (
    <section aria-label={t('Coming up')} className="rounded-[24px] bg-[#fffdf9] p-4 shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">Okulandelayo · Coming up</p>
          <h2 className="mt-0.5 font-display text-[1.25rem] font-semibold leading-tight text-ink">{t('What to finish next')}</h2>
        </div>
      </div>
      <ul className="mt-2 divide-y divide-ink/[0.06]">
        {list.map(({ row, due, daysLeft }) => {
          const late = daysLeft < 0
          const soon = !late && daysLeft <= 7
          return (
            <li key={row.key}>
              <button type="button" onClick={onOpenList} className="flex w-full items-center gap-3 px-1 py-2.5 text-left">
                <span aria-hidden="true" className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${late ? 'bg-terracotta' : soon ? 'bg-ochre' : 'bg-sage-500'}`} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{row.label}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-ink-muted">
                    <span className={late ? 'font-bold text-terracotta-dark' : soon ? 'font-bold text-ink' : ''}>{t(describeDue(daysLeft))}</span>
                    {' · '}<DateText value={due} />{' · '}{t(phaseLabel(row.phase)).split(' · ')[0]}
                  </span>
                </span>
                <Icon name="chevron-right" size={16} color="#b5ab9f" />
              </button>
            </li>
          )
        })}
      </ul>
      {onOpenList && (
        <button type="button" onClick={onOpenList} className="pressable mt-1 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-cream text-[13px] font-extrabold text-terracotta-dark">
          {more > 0 ? t('See the whole plan ({n} more due)', { n: more }) : t('See the whole plan')} <Icon name="arrowRight" size={14} />
        </button>
      )}
    </section>
  )
}
