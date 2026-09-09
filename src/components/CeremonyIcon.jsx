import Icon from './Icon.jsx'

// One mark per ceremony type, drawn as line art inside a double ring — the
// style Lovable settled on. Keyed by the same enum the API uses, so a type we
// haven't drawn yet falls back to the calendar rather than rendering nothing.
const CEREMONY_ICONS = {
  ULWALUKO: 'shieldCheck',
  UMGIDI: 'drum',
  INTAMBO_ENKULU: 'link2',
  UKUKHAPHA: 'footprints',
  INKOBE_ZIKA_MAMA: 'wheat',
  UKUBUYISA: 'houseHeart',
  UMSEBENZI_WEGQIRHA: 'sprout',
  WEDDING: 'heartHandshake',
  GENERAL_EVENT: 'calendarRange',
}

export function ceremonyIconName(type) {
  return CEREMONY_ICONS[type] || 'calendarRange'
}

export default function CeremonyIcon({ type, size = 44, tone = 'terracotta', className = '' }) {
  const dark = tone === 'light'
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex flex-shrink-0 items-center justify-center rounded-full border ${
        dark
          ? 'border-white/25 bg-white/10 text-cream'
          : 'border-terracotta/20 bg-white text-terracotta shadow-soft'
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className={`absolute rounded-full border ${dark ? 'border-white/20' : 'border-brand-ochre/25'}`}
        style={{ inset: Math.max(3, Math.round(size * 0.09)) }}
      />
      <Icon name={ceremonyIconName(type)} size={Math.round(size * 0.45)} strokeWidth={1.65} className="relative" />
    </span>
  )
}
