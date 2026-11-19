// Feast quantities for a ceremony: meat, starch, vegetables and plates for a
// number of guests. Every figure is a starting point the family can change;
// none is a rule of custom.
//
// Sources and reasoning:
// - Meat on the bone: 320 g a person, Food & Home's South African catering
//   guide (bone-in beef joints). foodandhome.co.za/how-to/calculate-catering-quantities-per-person
// - A sheep gives about 18 kg of meat and a beast about 200 kg: the
//   founder's figures from slaughtering for ceremonies. The person
//   slaughtering will know the animal in front of them.
// - Maize meal, cabbage, spinach, potatoes, oil, sugar and plates use the same
//   per-guest fractions the ceremony planner already scales its catering lines
//   by (server/controllers/ceremonyCostProfiles.js).
// - Rice: about 70 g uncooked a person as a side dish, the common catering
//   figure, since pap is the main starch.
// Prices mirror COST_RATES on the server and are estimates.

export const MEAT_KG_PER_GUEST = 0.32
export const SHEEP_MEAT_KG = 18
export const BEAST_MEAT_KG = 200

const PRICES = {
  sheep: 2700, beast: 18000, maize50: 520, rice10: 195, cabbage: 22,
  spinach: 25, potatoes10: 113.99, oil5: 158.95, sugar10: 232.25, plates50: 140,
}

const count = (value) => Math.max(0, Math.floor(Number(value) || 0))

// Animals for the meat: the beasts the family chooses, then enough sheep to
// cover the rest.
export function animalsFor(guests, beasts = 0) {
  const people = count(guests)
  const cattle = count(beasts)
  const meatKg = Math.ceil(people * MEAT_KG_PER_GUEST)
  const left = Math.max(0, meatKg - cattle * BEAST_MEAT_KG)
  const sheep = people === 0 ? 0 : Math.ceil(left / SHEEP_MEAT_KG)
  return { meatKg, beasts: cattle, sheep }
}

const units = (people, perGuest) => (people === 0 ? 0 : Math.max(1, Math.ceil(people * perGuest)))

// The full shopping list for a number of guests.
export function feastFor(guests, beasts = 0) {
  const people = count(guests)
  const animals = animalsFor(people, beasts)
  const lines = [
    { key: 'beast', search: 'Inkomo', label: 'Beast (inkomo)', qty: animals.beasts, unit: 'beast', price: PRICES.beast, group: 'Inyama · Meat' },
    { key: 'sheep', search: 'Sheep', label: 'Sheep (igusha)', qty: animals.sheep, unit: 'sheep', price: PRICES.sheep, group: 'Inyama · Meat' },
    { key: 'maize', search: 'Maize Meal', label: 'Maize meal for pap', qty: units(people, 0.003), unit: '50 kg bag', price: PRICES.maize50, group: 'Ipapa nerayisi · Pap and rice' },
    { key: 'rice', search: 'Rice', label: 'Rice', qty: units(people, 0.007), unit: '10 kg bag', price: PRICES.rice10, group: 'Ipapa nerayisi · Pap and rice' },
    { key: 'cabbage', search: 'Cabbage', label: 'Cabbage', qty: units(people, 1 / 18), unit: 'head', price: PRICES.cabbage, group: 'Imifuno · Vegetables' },
    { key: 'spinach', search: 'Spinach', label: 'Spinach', qty: units(people, 1 / 15), unit: 'bundle', price: PRICES.spinach, group: 'Imifuno · Vegetables' },
    { key: 'potatoes', search: 'Potatoes', label: 'Potatoes', qty: units(people, 0.01), unit: '10 kg bag', price: PRICES.potatoes10, group: 'Imifuno · Vegetables' },
    { key: 'oil', search: 'Cooking Oil', label: 'Cooking oil', qty: units(people, 0.003), unit: '5 L', price: PRICES.oil5, group: 'Ekhitshini · Kitchen' },
    { key: 'sugar', search: 'Sugar', label: 'Sugar for tea', qty: units(people, 0.002), unit: '10 kg bag', price: PRICES.sugar10, group: 'Ekhitshini · Kitchen' },
    { key: 'plates', search: 'Plate', label: 'Plates and spoons', qty: units(people, 0.02), unit: 'pack of 50', price: PRICES.plates50, group: 'Ekhitshini · Kitchen' },
  ].filter((line) => line.qty > 0)
  const total = Math.round(lines.reduce((sum, line) => sum + line.qty * line.price, 0))
  return { guests: people, meatKg: animals.meatKg, lines, total, perGuest: people ? Math.round(total / people) : 0 }
}
