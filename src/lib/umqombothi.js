// Umqombothi quantities. The grain rule is the app's existing one, confirmed
// against four reference brews: each litre needs 0.1 kg each of maize meal,
// umbona and amazimba. A brew needs about twice its volume in container space
// so the foam (igwebu) can rise: 20 L goes in a 30 L container, 30 L in a 50 L
// ifatyi, 50 L in a 100 L ifatyi and 100 L in a 200 L ifatyi.

export const KG_PER_LITRE = 0.1
export const DEFAULT_LITRES_PER_GUEST = 1
export const MIN_LITRES_PER_GUEST = 0.5
export const MAX_LITRES_PER_GUEST = 3

const CONTAINERS = [
  { maxLitres: 20, name: '30 L container' },
  { maxLitres: 30, name: '50 L ifatyi' },
  { maxLitres: 50, name: '100 L ifatyi' },
  { maxLitres: 100, name: '200 L ifatyi' },
]
const LARGEST = CONTAINERS[CONTAINERS.length - 1]

const roundTo = (value, step) => Math.round(value / step) * step

// Litres to brew for a number of guests, rounded up to the next 5 L.
export function litresForGuests(guests, litresPerGuest = DEFAULT_LITRES_PER_GUEST) {
  const count = Math.max(0, Number(guests) || 0)
  const perGuest = Math.min(MAX_LITRES_PER_GUEST, Math.max(MIN_LITRES_PER_GUEST, Number(litresPerGuest) || DEFAULT_LITRES_PER_GUEST))
  if (count === 0) return 0
  return Math.max(5, Math.ceil((count * perGuest) / 5) * 5)
}

// Kilograms of each of the three grains, to one decimal place.
export function grainKg(litres) {
  return roundTo(Math.max(0, Number(litres) || 0) * KG_PER_LITRE, 0.1).toFixed(1)
}

// The containers a brew needs: the smallest one that fits, or several of the
// largest when the brew is bigger than one 200 L ifatyi can hold.
export function containersFor(litres) {
  const volume = Math.max(0, Number(litres) || 0)
  if (volume === 0) return { count: 0, name: LARGEST.name, label: '' }
  const fit = CONTAINERS.find((c) => volume <= c.maxLitres)
  if (fit) return { count: 1, name: fit.name, label: `1 × ${fit.name}` }
  const count = Math.ceil(volume / LARGEST.maxLitres)
  return { count, name: LARGEST.name, label: `${count} × ${LARGEST.name}` }
}
