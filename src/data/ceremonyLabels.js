// Human-readable ceremony names, keyed by the backend CeremonyType enum
// value. A shared home for the one thing every ceremony screen needs —
// the real display name — so a screen that only needs a title (like the
// full-day timeline) doesn't fall back to showing the raw enum value
// ("UMSEBENZI_WEGQIRHA") with underscores swapped for spaces.
export const CEREMONY_LABEL = {
  ULWALUKO: 'Ulwaluko',
  UMGIDI: 'Umgidi',
  INTAMBO_ENKULU: 'Intambo Enkulu',
  UKUKHAPHA: 'Ukukhapha',
  INKOBE_ZIKA_MAMA: 'Inkobe zikaMama',
  UKUBUYISA: 'Ukubuyisa',
  UMSEBENZI_WEGQIRHA: 'Umsebenzi weGqirha',
  WEDDING: 'Wedding',
  GENERAL_EVENT: 'General Event',
}

export function labelForCeremonyType(type) {
  return CEREMONY_LABEL[type] || (type ? type.replace(/_/g, ' ') : '')
}
