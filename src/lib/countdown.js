// Friendly countdowns for ceremonies and deadlines: "tomorrow", "in 3 weeks",
// "in 13 months" instead of "412 days to go".

const DAY_MS = 86400000

// Whole days from today to the given date, or null when there is no date or
// it has already passed. Both ends are taken at local midnight.
export function daysUntil(dateValue, now = new Date()) {
  if (!dateValue) return null
  const target = new Date(dateValue)
  if (Number.isNaN(target.getTime())) return null
  const ms = new Date(target).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)
  const days = Math.round(ms / DAY_MS)
  return days >= 0 ? days : null
}

export function describeCountdown(days) {
  if (days == null) return ''
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 14) return `in ${days} days`
  if (days < 63) return `in ${Math.round(days / 7)} weeks`
  const months = Math.round(days / 30.44)
  if (months < 24) return `in ${months} months`
  return `in ${Math.round(days / 365.25)} years`
}

// The ceremony to feature: the soonest one still ahead, otherwise the first
// one without a date, otherwise the first in the list.
export function nextCeremony(ceremonies = [], now = new Date()) {
  const upcoming = ceremonies
    .map((ceremony) => ({ ceremony, days: daysUntil(ceremony?.eventDate, now) }))
    .filter((entry) => entry.days != null)
    .sort((a, b) => a.days - b.days)
  if (upcoming.length) return upcoming[0].ceremony
  return ceremonies.find((ceremony) => !ceremony?.eventDate) || ceremonies[0] || null
}
