// When it gets dark in Gqeberha on a given day (founder, 23 Nov 2026: "many
// ceremonies lack lighting; once it reaches 7:30 pm it becomes dark").
// Sunset and the end of civil twilight (when it is properly dark) from the
// standard NOAA solar formulas, for Gqeberha (33.96° S, 25.60° E, SAST,
// UTC+2). Accurate to a minute or two, which is all a family needs.
const LAT = -33.96
const LON = 25.6
const TZ = 2
const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

// Minutes after midnight (SAST) when the sun is `depression` degrees below
// the horizon in the evening: 0.833 for sunset, 6 for the end of twilight.
function eveningMinutes(date, depression) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000)
  const g = ((2 * Math.PI) / 365) * (day - 1)
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const cosH = (Math.cos(rad(90 + depression)) - Math.sin(rad(LAT)) * Math.sin(decl)) / (Math.cos(rad(LAT)) * Math.cos(decl))
  const h = deg(Math.acos(Math.max(-1, Math.min(1, cosH))))
  return 720 - 4 * (LON - h) - eqTime + TZ * 60
}

const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`.replace(/:60$/, ':59')

// { sunset: '19:31', dark: '19:58' } for a date (Date or ISO string), or null.
export function darkness(when) {
  const date = when instanceof Date ? when : when ? new Date(when) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return { sunset: hhmm(eveningMinutes(date, 0.833)), dark: hhmm(eveningMinutes(date, 6)) }
}
