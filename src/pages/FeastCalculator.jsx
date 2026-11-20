import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { BEAST_MEAT_KG, SHEEP_MEAT_KG, feastFor } from '../lib/feast.js'

const rand = (value) => `R${Math.round(value).toLocaleString('en-ZA')}`

// Isidlo: how much food to buy for the guests. Opened from a ceremony, it
// starts from that ceremony's guest count.
function FeastCalculator({ onBack, onOpenStore, guestCount = null, ceremonyTitle = '' }) {
  const fromCeremony = guestCount != null && Number(guestCount) > 0
  const [guests, setGuests] = useState(fromCeremony ? String(guestCount) : '')
  const [beasts, setBeasts] = useState(0)
  const feast = feastFor(guests, beasts)
  const groups = [...new Set(feast.lines.map((line) => line.group))]

  return (
    <div className="mx-auto min-h-screen max-w-md bg-cream pb-28">
      <div className="relative overflow-hidden rounded-b-[32px] bg-[#2e4a2e] px-5 pb-16 pt-6 text-cream">
        <button type="button" onClick={onBack} className="pressable mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-cream/80">
          <Icon name="arrowLeft" size={16} /> {ceremonyTitle ? `Back to ${ceremonyTitle}` : 'Back'}
        </button>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b9d3b0]">Isidlo · The feast</p>
        <h1 className="mt-1 font-display text-[2rem] font-semibold leading-tight">How much food to buy</h1>
        <p className="mt-1 text-sm text-cream/85">{fromCeremony ? `Worked out for ${ceremonyTitle || 'your ceremony'}.` : 'Meat, samp, vegetables and plates for your guests.'}</p>
      </div>

      <div className="relative z-10 -mt-10 space-y-4 px-4">
        <section className="space-y-4 rounded-[24px] bg-[#fffdf9] p-4 shadow-[0_22px_44px_-26px_rgba(43,30,18,0.6)]">
          <label className="block">
            <span className="text-[13px] font-bold text-ink-muted">Guests</span>
            <input
              type="number" inputMode="numeric" min="0" value={guests}
              onChange={(e) => setGuests(e.target.value)} placeholder="e.g. 250"
              className="mt-1 h-12 w-full rounded-[14px] border border-ink/15 bg-white px-4 text-lg font-extrabold text-ink"
            />
          </label>
          <div>
            <span className="text-[13px] font-bold text-ink-muted">Cattle to slaughter</span>
            <div className="mt-1 flex items-center gap-3">
              <button type="button" onClick={() => setBeasts((n) => Math.max(0, n - 1))} disabled={beasts === 0} aria-label="One less beast" className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-xl font-bold text-ink disabled:opacity-40">−</button>
              <span className="min-w-[4.5rem] text-center text-lg font-extrabold tabular-nums text-ink">{beasts}</span>
              <button type="button" onClick={() => setBeasts((n) => Math.min(10, n + 1))} aria-label="One more beast" className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-xl font-bold text-ink">+</button>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">Sheep make up the rest of the meat. If custom asks for a particular animal, start from that.</p>
          </div>
        </section>

        <section aria-live="polite" className="rounded-[24px] bg-[#1f3320] p-5 text-cream">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cream/60">Estimated food cost</p>
          <p className="mt-1 font-display text-[2.6rem] font-semibold leading-none tabular-nums">{rand(feast.total)}</p>
          <p className="mt-2 text-sm text-cream/75">
            {feast.guests ? `About ${rand(feast.perGuest)} a guest, for about ${feast.meatKg} kg of meat on the bone.` : 'Add the number of guests to see the list.'}
          </p>
        </section>

        {groups.map((group) => (
          <section key={group} aria-label={group}>
            <p className="px-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">{group}</p>
            <ul className="mt-2 overflow-hidden rounded-[20px] bg-[#fffdf9] shadow-soft">
              {feast.lines.filter((line) => line.group === group).map((line) => (
                <li key={line.key} className="flex items-center justify-between gap-3 border-b border-ink/5 px-4 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="text-[15px] font-extrabold text-ink">{line.label}</p>
                    <p className="text-xs text-ink-muted">{line.qty} × {line.unit}</p>
                  </div>
                  <span className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-sm font-extrabold tabular-nums text-ink">{rand(line.qty * line.price)}</span>
                    {onOpenStore && (
                      <button type="button" onClick={() => onOpenStore(line.search)} aria-label={`Find ${line.label} in Bulk Buy`} className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-[#a3471a]/10">
                        <Icon name="cart" size={15} color="#a3471a" />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {feast.guests > 0 && onOpenStore && (
          <button type="button" onClick={() => onOpenStore('')} className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#a3471a] text-[15px] font-extrabold text-cream">
            <Icon name="cart" size={18} color="#fffdf9" /> Open Bulk Buy
          </button>
        )}

        <p className="px-1 text-xs leading-relaxed text-ink-muted">
          A guide, not a rule. It counts about 320 g of meat on the bone a guest (Food &amp; Home’s catering guide), about {SHEEP_MEAT_KG} kg from a sheep and {BEAST_MEAT_KG} kg from a beast. Prices are estimates; every family knows its own guests best.
        </p>
      </div>
    </div>
  )
}

export default FeastCalculator
