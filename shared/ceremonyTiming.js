// When each stage of a ceremony should be done, like a wedding planner's
// month-by-month list. Days are counted from the ceremony date ("start"),
// or for ulwaluko's umgidi stages from the umgidi date ("homecoming").
// Negative means before. These are planning aims, not rules: the only fixed
// one is registration, which the Customary Initiation Act 2 of 2021 needs at
// least three months before the season.
const H = 'homecoming'
export const PHASE_TIMING = {
  // Ulwaluko: umgeno and ubukhwetha, counted from going to the mountain
  REGISTRATION: { days: -90 },
  SPIRITUAL_ITEMS: { days: -14 },
  TRANSPORT_ARRIVAL: { days: -7 },
  // At home his hair is cut first, then the ibhoma is built (founder).
  PHYSICAL_PREPARATION: { days: -3 },
  DAILY_ESSENTIALS: { days: -3 },
  DIET_EARLY_STAGE: { days: -2 },
  IBHOMA_CONSTRUCTION: { days: -2 },
  UMOJISO: { days: 5 },
  // Umphumo and umgidi, counted from umgidi
  EXIT_PREPARATION: { days: -7, anchor: H },
  RETURN_HOME: { days: -2, anchor: H },
  IBHOMA_CLOSURE: { days: -1, anchor: H },
  VIP_EKOYINI: { days: -45, anchor: H },
  HIERARCHY_ALLOCATION: { days: -30, anchor: H },
  ALCOHOL_DISTRIBUTION: { days: -21, anchor: H },
  ARRIVAL_INGQONGQO: { days: -14, anchor: H },
  ELDER_GUIDANCE: { days: -14, anchor: H },
  UBUKRWALA: { days: -14, anchor: H },
  COOKING_EBUHLANTI: { days: -7, anchor: H },
  COOKING_KITCHEN: { days: -5, anchor: H },
  KRAAL_SEATING: { days: -3, anchor: H },
  CLOSURE: { days: -3, anchor: H },
  // Wedding (umtshato)
  UKUCELA: { days: -180 },
  LOBOLA: { days: -120 },
  WEDDING_PLANNING: { days: -90 },
  WEDDING_SUPPLIERS: { days: -45 },
  WEDDING_FINAL: { days: -7 },
  WEDDING_DAY: { days: 0 },
  AFTER_WEDDING: { days: 1 },
  // Imbeleko and Intonjane (Intonjane's date is when the separation begins)
  ANIMAL_AND_OFFERING: { days: -7 },
  FOOD_AND_DRINK: { days: -3 },
  PREPARATION: { days: -7 },
  CELEBRATION: { days: 21 },
  // Mourning, after the funeral
  MOURNING: { days: 7 },
  MOURNING_END: { days: 365 },
}

// Stages named by kind, for the ancestral rites and other ceremonies.
const BY_PREFIX = [
  ['PLANNING', -30], ['PURPOSE', -21], ['SUPPLIES', -14], ['BREWING', -7],
  ['INKOBE_PREP', -2], ['SECLUSION', -2], ['KRAAL', -1], ['LOGISTICS', -14],
]

export function timingFor(phase) {
  if (PHASE_TIMING[phase]) return PHASE_TIMING[phase]
  const hit = BY_PREFIX.find(([prefix]) => String(phase || '').startsWith(prefix))
  return { days: hit ? hit[1] : 0 }
}

const DAY = 86400000
const atMidnight = (value) => { const d = new Date(value); d.setHours(0, 0, 0, 0); return d }

// The date a stage should be done by, or null without a ceremony date.
// For ulwaluko without an umgidi date yet, umgidi is taken as four weeks
// after going in. For an umgidi on its own, its date is the anchor.
export function dueDateFor(phase, ceremony) {
  if (!ceremony?.eventDate) return null
  const { days, anchor } = timingFor(phase)
  let base = atMidnight(ceremony.eventDate)
  if (anchor === 'homecoming' && ceremony.type === 'ULWALUKO') {
    base = ceremony.homecomingDate ? atMidnight(ceremony.homecomingDate) : new Date(base.getTime() + 28 * DAY)
  }
  return new Date(base.getTime() + days * DAY)
}

// Undone tasks and things still to buy, soonest first, with how near they are.
export function comingUp(rows, ceremony, { now = new Date(), withinDays = 21, limit = 6 } = {}) {
  const today = atMidnight(now)
  return rows
    .filter((row) => (row.kind === 'task' || row.kind === 'cost') && !row.done)
    .map((row) => {
      const due = dueDateFor(row.phase, ceremony)
      return due ? { row, due, daysLeft: Math.round((due - today) / DAY) } : null
    })
    .filter((entry) => entry && entry.daysLeft <= withinDays)
    .sort((a, b) => a.due - b.due)
    .slice(0, limit)
}

export function describeDue(daysLeft) {
  // A plan made late (days before going in) should not shout big numbers.
  if (daysLeft < -14) return 'Should already be done'
  if (daysLeft < 0) return daysLeft === -1 ? 'Overdue by a day' : `Overdue by ${-daysLeft} days`
  if (daysLeft === 0) return 'Today'
  if (daysLeft === 1) return 'Tomorrow'
  if (daysLeft < 14) return `In ${daysLeft} days`
  return `In ${Math.round(daysLeft / 7)} weeks`
}
