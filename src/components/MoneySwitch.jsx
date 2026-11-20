import Icon from './Icon.jsx'

// Imali: saving and buying are two halves of one thing. Stokvels save the
// money; Bulk Buy spends it together at group prices. This switch sits at
// the top of both, under the one "Imali" tab.
export default function MoneySwitch({ active, onSwitch }) {
  const sides = [
    { id: 'stokvels', icon: 'coins', label: 'Yonga · Save' },
    { id: 'store', icon: 'cart', label: 'Thenga · Buy' },
  ]
  return (
    <div role="tablist" aria-label="Imali: save or buy" className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-black/25 p-1 backdrop-blur-sm">
      {sides.map((side) => {
        const on = active === side.id
        return (
          <button
            key={side.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => !on && onSwitch(side.id)}
            className={`pressable flex min-h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-extrabold ${on ? 'bg-cream text-[#1f3320]' : 'text-cream/80'}`}
          >
            <Icon name={side.icon} size={15} color={on ? '#1f3320' : '#fffdf9'} /> {side.label}
          </button>
        )
      })}
    </div>
  )
}
