import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import {
  DEFAULT_LITRES_PER_GUEST, MAX_LITRES_PER_GUEST, MIN_LITRES_PER_GUEST,
  containersFor, grainKg, litresForGuests,
} from '../lib/umqombothi.js'

const STEPS = [
  { title: 'Ukudidiyela', day: 'Day 1', text: 'Boil water over an eziko/wood fire in a traditional pot, mix with maize meal and umbona. Once cooled at night, add the first half of the amazimba.' },
  { title: 'Ukupheka Izidudu', day: 'Day 2, morning', text: 'Cook the mixture into izidudu. Transfer into 15–20kg enamel dishes and let cool completely.' },
  { title: 'Ukufaka', day: 'Day 2, after cooling', text: 'Transfer into the ifatyi (blue plastic container) sized for your volume, and add the remaining amazimba.' },
  { title: 'Fermenting Stage', day: 'Day 3', text: 'Let it stand undisturbed for a full day to rise and form rich foam (igwebu).' },
  { title: 'Ukuhluza', day: 'Day 4', text: 'Strain the mixture completely using traditional strainers to extract the sacred, thin liquid the people and elders will drink.' },
]

const LITRE_PRESETS = [20, 30, 50, 100]

// Opened from a ceremony, it starts from that ceremony's guest count. Opened
// from More, it starts from litres, as before.
function UmqombothiCalculator({ onBack, guestCount = null, ceremonyTitle = '' }) {
  const fromCeremony = guestCount != null && Number(guestCount) > 0
  const [mode, setMode] = useState(fromCeremony ? 'guests' : 'litres')
  const [guests, setGuests] = useState(fromCeremony ? String(guestCount) : '')
  const [perGuest, setPerGuest] = useState(DEFAULT_LITRES_PER_GUEST)
  const [manualLitres, setManualLitres] = useState(30)

  const litres = mode === 'guests' ? litresForGuests(guests, perGuest) : manualLitres
  const kg = grainKg(litres)
  const containers = containersFor(litres)
  const stepPerGuest = (delta) => setPerGuest((value) => Math.min(MAX_LITRES_PER_GUEST, Math.max(MIN_LITRES_PER_GUEST, value + delta)))

  return (
    <div className="mx-auto min-h-screen max-w-md bg-cream pb-28">
      <div className="relative overflow-hidden rounded-b-[32px] bg-[#1c1612] px-5 pb-16 pt-6 text-cream">
        <button type="button" onClick={onBack} className="pressable mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-cream/80">
          <Icon name="arrowLeft" size={16} /> {ceremonyTitle ? `Back to ${ceremonyTitle}` : 'Back'}
        </button>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#e0a94e]">Umqombothi</p>
        <h1 className="mt-1 font-display text-[2rem] font-semibold leading-tight">How much to brew</h1>
        <p className="mt-1 text-sm text-cream/80">{fromCeremony ? `Worked out for ${ceremonyTitle || 'your ceremony'}.` : 'By number of guests, or by litres.'}</p>
      </div>

      <div className="relative z-10 -mt-10 space-y-4 px-4">
        {/* Inputs: by guests or by litres */}
        <section className="rounded-[24px] bg-[#fffdf9] p-4 shadow-[0_22px_44px_-26px_rgba(43,30,18,0.6)]">
          <div role="tablist" aria-label="Work it out by" className="grid grid-cols-2 gap-1 rounded-full bg-cream-dark p-1">
            {[{ id: 'guests', label: 'By guests' }, { id: 'litres', label: 'By litres' }].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                onClick={() => setMode(tab.id)}
                className={`pressable min-h-11 rounded-full text-sm font-extrabold ${mode === tab.id ? 'bg-[#1c1612] text-cream' : 'text-ink-muted'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mode === 'guests' ? (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-[13px] font-bold text-ink-muted">Guests</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder="e.g. 250"
                  className="mt-1 h-12 w-full rounded-[14px] border border-ink/15 bg-white px-4 text-lg font-extrabold text-ink"
                />
              </label>
              <div>
                <span className="text-[13px] font-bold text-ink-muted">Litres per guest</span>
                <div className="mt-1 flex items-center gap-3">
                  <button type="button" onClick={() => stepPerGuest(-0.5)} disabled={perGuest <= MIN_LITRES_PER_GUEST} aria-label="Less per guest" className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-xl font-bold text-ink disabled:opacity-40">−</button>
                  <span className="min-w-[4.5rem] text-center text-lg font-extrabold tabular-nums text-ink">{perGuest} L</span>
                  <button type="button" onClick={() => stepPerGuest(0.5)} disabled={perGuest >= MAX_LITRES_PER_GUEST} aria-label="More per guest" className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-xl font-bold text-ink disabled:opacity-40">+</button>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">A starting point of 1 litre each. Change it to how much your family usually brews.</p>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="grid grid-cols-4 gap-2">
                {LITRE_PRESETS.map((value) => (
                  <button key={value} type="button" onClick={() => setManualLitres(value)} className={`pressable min-h-11 rounded-full text-sm font-extrabold ${manualLitres === value ? 'bg-[#1c1612] text-cream' : 'bg-cream-dark text-ink-muted'}`}>
                    {value} L
                  </button>
                ))}
              </div>
              <label className="mt-4 block">
                <span className="sr-only">Litres</span>
                <input type="range" min="10" max="400" step="5" value={manualLitres} onChange={(e) => setManualLitres(parseInt(e.target.value, 10))} className="w-full accent-[#1c1612]" />
              </label>
            </div>
          )}
        </section>

        {/* Result */}
        <section aria-live="polite" className="overflow-hidden rounded-[24px] bg-[#1c1612] text-cream">
          <div className="p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-ochre-light">You need to brew</p>
            <p className="mt-1 font-display text-[2.6rem] font-semibold leading-none tabular-nums">{litres} L</p>
            <p className="mt-2 text-sm text-[#c9bfb2]">{containers.label ? `In ${containers.label}, with room for the igwebu to rise.` : 'Add the number of guests to see how much.'}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[{ label: 'Maize meal' }, { label: 'Umbona' }, { label: 'Amazimba' }].map((grain) => (
                <div key={grain.label} className="rounded-[16px] bg-[#2a211a] px-2 py-3 text-center">
                  <p className="text-lg font-extrabold tabular-nums text-ochre-light">{kg} kg</p>
                  <p className="mt-0.5 text-xs font-bold text-[#c9bfb2]">{grain.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section aria-label="Brewing steps" className="pt-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-terracotta-dark">Brewing steps</p>
          <ol className="mt-3 space-y-2.5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3 rounded-[18px] bg-[#fffdf9] p-4 shadow-soft">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1c1612] font-display text-sm font-semibold text-cream">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-[15px] font-extrabold text-ink">{step.title}</p>
                    <span className="text-xs font-bold text-sage-600">{step.day}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

export default UmqombothiCalculator
