import { useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { cn } from '../../lib/utils'
import { rand } from './format.js'
import { pressable } from './styles.js'
import { useT } from '../../i18n/index.jsx'

// One line of the plan: a round tick, the item, a quiet guide price, and
// what was paid. The paid box stays out of the way until it is needed: tap
// "+ Paid" to enter an amount; once saved it shows as a small chip.
export default function ListRow({ row, showTick = true, busy, onToggle, onSavePrice, onBuy }) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  if (row.kind === 'note') {
    return <p className="py-2.5 text-[13px] font-semibold text-terracotta-dark">{row.label}</p>
  }
  const guide = row.suggested != null
    ? `${t('Guide')} ${rand(row.suggested)}${row.quantity > 1 ? ` · ${row.quantity} × ${rand(row.unitPrice)}` : ''}`
    : null
  const save = (value) => { setEditing(false); onSavePrice(row, value) }

  return (
    <div className="flex items-center gap-3 py-2.5">
      {showTick && (
        <button
          type="button"
          aria-label={row.done ? t('Mark {item} as not done', { item: row.label }) : t('Mark {item} as done', { item: row.label })}
          aria-pressed={row.done}
          disabled={busy}
          onClick={() => onToggle(row)}
          className={cn('-m-2 flex h-11 w-11 flex-shrink-0 items-center justify-center', pressable)}
        >
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border-[1.5px]', row.done ? 'border-[#2e4a2e] bg-[#2e4a2e]' : 'border-ink/25 bg-white')}>
            {row.done && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}
          </span>
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] leading-snug break-words', row.done ? 'text-ink-muted line-through' : 'text-ink')}>{row.label}</p>
        {guide && !editing && <p className="mt-0.5 text-[12px] text-ink-muted">{guide}</p>}
        {editing && (
          <label className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-ink-muted">{t('Paid')} R</span>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder={row.suggested != null ? String(Math.round(row.suggested)) : '0'}
              defaultValue={row.actual ?? ''}
              disabled={busy}
              onBlur={(e) => save(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(false) }}
              className="h-9 w-28 rounded-[10px] border border-ink/15 bg-white px-2.5 text-right text-[15px] text-ink focus:border-[#2e4a2e] focus:outline-none"
            />
          </label>
        )}
      </div>

      {!editing && (
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {row.cost?.skuId && !row.done && (
            <button type="button" onClick={() => onBuy(row.cost)} className={cn('h-8 rounded-full border border-[#2e4a2e]/30 px-3 text-[12px] font-bold text-[#1f3320]', pressable)}>
              {t('Buy')}
            </button>
          )}
          {/* "+ Paid" only where money is involved: a step such as written
              consent is not a purchase, and a pay button on it makes the
              list feel like a till slip. */}
          {row.actual != null ? (
            <button type="button" onClick={() => setEditing(true)} aria-label={t('Paid {amount}, change', { amount: rand(row.actual) })} className={cn('h-8 rounded-full bg-[#2e4a2e]/10 px-3 text-[12px] font-bold text-[#1f3320]', pressable)}>
              {t('Paid')} {rand(row.actual)}
            </button>
          ) : (row.suggested != null || row.cost) && (
            <button type="button" onClick={() => setEditing(true)} aria-label={t('Add what you paid for {item}', { item: row.label })} className={cn('h-8 rounded-full px-2.5 text-[12px] font-semibold text-ink-muted', pressable)}>
              {t('+ Paid')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
