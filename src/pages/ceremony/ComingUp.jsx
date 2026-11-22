import Icon from '../../components/Icon.jsx'
import { comingUp, describeDue } from '../../../shared/ceremonyTiming.js'
import { phaseLabel } from '../../../shared/ceremonyList.js'
import { DateText, useLanguage, useT } from '../../i18n/index.jsx'


// What to do next, by date, like a wedding planner's "this week" list. The
// dates are aims worked out from the ceremony date; only registration for
// ulwaluko is a legal deadline.
export default function ComingUp({ rows, ceremony, onOpenList }) {
  const t = useT()
  const { lang } = useLanguage()
  if (!ceremony?.eventDate) return null
  const list = comingUp(rows, ceremony)
  if (list.length === 0) return null
  return (
    <section aria-label={t('Coming up')} className="rounded-[24px] bg-[#fffdf9] p-5 shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">Okulandelayo · Coming up</p>
      <h2 className="mt-1 font-display text-[1.3rem] font-semibold leading-tight text-ink">{t('What to finish next')}</h2>
      <ul className="mt-3 space-y-2">
        {list.map(({ row, due, daysLeft }) => (
          <li key={row.key} className="flex items-start gap-3 rounded-[18px] border border-ink/[0.06] bg-white p-3">
            <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${daysLeft < 0 ? 'bg-terracotta text-white' : daysLeft <= 7 ? 'bg-ochre-light/30 text-terracotta-dark' : 'bg-cream-dark text-ink'}`}>
              <Icon name={daysLeft < 0 ? 'clock' : 'calendar'} size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold leading-snug text-ink">{row.label}</span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                <span className={daysLeft < 0 ? 'font-bold text-terracotta-dark' : 'font-bold text-ink'}>{t(describeDue(daysLeft))}</span>
                {' · '}{t('aim for')}{lang === 'xh' ? '' : ' '}<DateText value={due} /> · {t(phaseLabel(row.phase))}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {onOpenList && (
        <button type="button" onClick={onOpenList} className="pressable mt-3 text-sm font-extrabold text-terracotta-dark">{t('See the whole plan →')}</button>
      )}
    </section>
  )
}
