import Icon from '../Icon.jsx'

const STYLE = {
  PLEDGE_RECEIVED: { icon: 'gift', color: '#2f6b5a' },
  CONTRIBUTION_CONFIRMED: { icon: 'check', color: '#4a7a4a' },
  ORDER_MATCHED: { icon: 'package', color: '#4a7a4a' },
  ORDER_FULFILLED: { icon: 'package', color: '#4a7a4a' },
  POOL_CHANGED: { icon: 'cart', color: '#c1922f' },
  QUOTE_STATUS: { icon: 'cocktail', color: '#c1922f' },
  GROUP_EXPENSE_RECORDED: { icon: 'coins', color: '#c1922f' },
}
const DEFAULT_STYLE = { icon: 'bell', color: '#c45c26' }

// Activity strip on Home, like the activity feed on Instagram/Facebook: the
// newest unread updates (pledges, offers, orders) one tap away. Hidden when
// there is nothing new, so Home never feels noisy.
export default function WhatsNew({ items, onOpenItem, onSeeAll }) {
  if (!items.length) return null
  return (
    <section className="mb-8" aria-label="What's new">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="eyebrow text-terracotta">Okutsha · What's new</p>
          <h2 className="font-display text-[1.4rem] font-semibold leading-tight text-ink">
            {items.length === 1 ? '1 new update' : `${items.length} new updates`}
          </h2>
        </div>
        <button type="button" onClick={onSeeAll} className="text-xs font-bold text-terracotta flex-shrink-0 pb-1 min-h-11">See all →</button>
      </div>
      <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 snap-x">
        {items.slice(0, 5).map((n) => {
          const style = STYLE[n.type] || DEFAULT_STYLE
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onOpenItem(n)}
              className="pressable snap-start relative flex w-[240px] flex-shrink-0 items-start gap-3 overflow-hidden rounded-[18px] bg-white p-3.5 text-left shadow-soft ring-1 ring-ink/[0.06]"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: style.color }} />
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${style.color}1a` }}>
                <Icon name={style.icon} size={18} color={style.color} />
              </span>
              <span className="line-clamp-3 text-[13px] font-semibold leading-snug text-ink">{n.message}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
