import CeremonyIcon from '../../components/CeremonyIcon.jsx'
import Icon from '../../components/Icon.jsx'
import { cn } from '../../lib/utils'
import { CEREMONY_META, typeName } from './ceremonyMeta.js'
import { LABELS } from './wizardText.js'
import Bi from './Bi.jsx'
import { inputClass, pressable } from './styles.js'

const GUEST_QUICK_PICKS = [50, 100, 150, 200]

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink mb-1.5"><Bi {...label} /></span>
      {children}
      {hint && <span className="block text-xs text-ink-muted mt-2 leading-relaxed">{hint}</span>}
    </label>
  )
}

// Step 1: one big tap per ceremony type. A plan's type cannot change once it
// exists (its lists were built for that type), so it is shown but locked.
export function TypeStep({ form, setForm, ceremonyTypes, locked }) {
  const types = ceremonyTypes.length ? ceremonyTypes : Object.keys(CEREMONY_META)
  return (
    <div className="space-y-2">
      {types.map((typeId) => {
        const selected = form.type === typeId
        return (
          <button
            key={typeId}
            type="button"
            disabled={locked && !selected}
            aria-pressed={selected}
            onClick={() => setForm((f) => ({ ...f, type: typeId }))}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-soft border-2 text-left bg-white',
              selected ? 'border-sage-500 bg-sage-50' : 'border-cream-dark',
              locked && !selected && 'opacity-40',
              pressable,
            )}
          >
            <CeremonyIcon type={typeId} size={52} />
            <span className="flex-1 min-w-0">
              <span className="block text-base font-bold text-ink">{typeName(typeId)}</span>
              <span className="block text-xs text-ink-muted">{CEREMONY_META[typeId]?.desc || 'Ceremony planning'}</span>
            </span>
            {selected && <Icon name="check" size={22} color="#4a7a4a" strokeWidth={2.5} />}
          </button>
        )
      })}
      {locked && <p className="text-xs text-ink-muted pt-1">The kind of ceremony cannot be changed once the plan is made.</p>}
    </div>
  )
}

export function WhenStep({ form, setForm }) {
  return (
    <div className="space-y-5">
      <Field label={LABELS.ceremonyName}>
        <input
          type="text"
          className={inputClass}
          placeholder={`e.g. ${CEREMONY_META[form.type]?.titleExample || 'Name this plan'}`}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </Field>
      <Field label={LABELS.date}>
        <input
          type="date"
          className={inputClass}
          value={form.eventDate}
          onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
        />
      </Field>
    </div>
  )
}

export function GuestsStep({ form, setForm, locked }) {
  const hint = locked
    ? 'Changing this does not change the quantities already on your shopping list.'
    : 'For Umgidi, this sets the catering quantities (maize meal, potatoes, vegetables) for you. You can skip it and add it later.'
  return (
    <div className="space-y-4">
      <Field label={LABELS.guests} hint={hint}>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          className={inputClass}
          placeholder="e.g. 150"
          value={form.guestCount}
          onChange={(e) => setForm((f) => ({ ...f, guestCount: e.target.value }))}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        {GUEST_QUICK_PICKS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setForm((f) => ({ ...f, guestCount: String(n) }))}
            className={cn('h-11 px-5 rounded-pill border-2 text-base font-bold', String(n) === form.guestCount ? 'border-sage-500 bg-sage-50 text-sage-700' : 'border-cream-dark bg-white text-ink', pressable)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function MoneyStep({ form, setForm }) {
  return (
    <Field label={LABELS.budget} hint="The most you plan to spend, in rand. You can skip this and set it later.">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-ink-muted">R</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          className={cn(inputClass, 'pl-10')}
          placeholder="e.g. 50000"
          value={form.budget}
          onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
        />
      </div>
    </Field>
  )
}
