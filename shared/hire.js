// What a family hires for a ceremony at home in Gqeberha, and roughly what it
// costs (founder, 23 Nov 2026: "they hire out everything in our days").
// Quantities follow the guest count; prices are ranges from hire companies'
// own published lists, never invented. A family sees the plan, chooses what
// it needs, and only then is it added to the budget, as its own stage.
// Research: docs/research/2026-11-hire-and-stokvels.md.

export const HIRE_VENDORS = {
  TENT_HIRE_WIZ: {
    name: 'Tent Hire Wiz Port Elizabeth',
    area: 'Delivers to Motherwell, Zwide, KwaZakhele, New Brighton, KwaDwesi, Bethelsdorp, Gelvandale, Kwanobuhle',
    contact: 'pe.tent-hirewiz.co.za',
    note: 'Tent, chairs and tables as one bundle, delivered, rigged and collected; rigged the day before.',
  },
  EXTREME_HIRING: {
    name: 'Extreme Hiring EC',
    area: 'Lorraine, Gqeberha (delivery priced by area)',
    contact: 'extremehiringec.co.za',
    note: 'Price list dated 17 Nov 2025: chairs, tables, urns, crockery, cutlery, gas burners.',
  },
  LIBHONGO: {
    name: 'Libhongo Decor & Hire',
    area: 'Gqeberha and 200 km around',
    contact: 'libhongoevents.co.za',
    note: 'Tents, chairs, tables and cutlery; styles imigidi and traditional ceremonies. Prices on quote.',
  },
  RED_CHERRY: {
    name: 'Red Cherry Events',
    area: 'North End, Gqeberha (R12/km return delivery)',
    contact: 'redcherryevents.co.za',
    note: 'Tents from R650, furniture from R100.',
  },
}

// Each item: what it is, how many for the guest count, and a price range
// (low and high) with where the price comes from.
export const HIRE_ITEMS = [
  {
    id: 'tent_bundle',
    label: 'Tent with chairs and tables (one bundle)',
    unit: 'bundle',
    qty: () => 1,
    // Tent Hire Wiz, northern areas: 50 seats R1,800-R3,200; 100 seats
    // R3,500-R6,000 (see tentRange below, which sizes it to the guests).
    price: (guests) => tentRange(guests),
    vendor: 'TENT_HIRE_WIZ',
    why: 'Covers the yard for the guests. Size it to the yard as well as the guests: a second tent goes up alongside when one yard cannot hold everyone.',
  },
  {
    id: 'kitchen_gazebo',
    label: 'Kitchen gazebo behind the house, for the cooks',
    unit: 'gazebo',
    qty: () => 1,
    price: () => [850, 850],
    from: true,
    vendor: 'TENT_HIRE_WIZ',
    why: 'Keeps the women cooking out of the wind and the sun.',
  },
  {
    id: 'mobile_fridge',
    label: 'Mobile fridge',
    unit: 'fridge',
    qty: () => 1,
    price: () => [650, 1200],
    vendor: 'TENT_HIRE_WIZ',
    why: 'For the meat and the drinks, so nothing spoils before the day.',
  },
  {
    id: 'gas_stove',
    label: 'Gas stove (plate burner)',
    unit: 'stove',
    qty: (guests) => Math.max(1, Math.ceil(guests / 75)),
    price: () => [350, 400],
    vendor: 'EXTREME_HIRING',
    why: 'One burner for about every 75 guests, beside the fires ebuhlanti. Gas is extra (a 9 kg cylinder).',
  },
  {
    id: 'urn',
    label: 'Urn, 20 litres (about 200 cups)',
    unit: 'urn',
    qty: (guests) => Math.max(1, Math.ceil(guests / 200)),
    price: () => [120, 120],
    vendor: 'EXTREME_HIRING',
    why: 'Tea and hot water through the day.',
  },
  {
    id: 'crockery',
    label: 'Dinner plates, spoons and cups for each guest',
    unit: 'guest set',
    qty: (guests) => guests,
    // Dinner plate R2.50, dessert spoon R1.75, cup and saucer R3.00.
    price: () => [7.25, 7.25],
    vendor: 'EXTREME_HIRING',
    why: 'Instead of plastic plates: hired, washed and returned.',
    optional: true,
  },
  {
    id: 'chafing',
    label: 'Chafing dish (8 L) with gel, to keep food warm',
    unit: 'dish',
    qty: (guests) => Math.max(2, Math.ceil(guests / 50)),
    price: () => [98, 98],
    vendor: 'EXTREME_HIRING',
    why: 'For the guests of honour served at the table.',
    optional: true,
  },
]

// Tent price across sizes: one 100-seat bundle per 100 guests, a 50-seat
// bundle for any 50 left over.
function tentRange(guests) {
  const hundreds = Math.floor(guests / 100)
  const rest = guests - hundreds * 100
  let low = hundreds * 3500
  let high = hundreds * 6000
  if (rest > 50) { low += 3500; high += 6000 } else if (rest > 0) { low += 1800; high += 3200 }
  if (!low) { low = 1800; high = 3200 }
  return [low, high]
}

const round = (n) => Math.round(n * 100) / 100

// The hire plan for a guest count: each item with its quantity and its
// total range, and the totals for the items a family would usually take.
export function hirePlan(guests) {
  const g = Math.max(10, Math.min(2000, Number(guests) || 150))
  const items = HIRE_ITEMS.map((item) => {
    const qty = item.qty(g)
    const [eachLow, eachHigh] = item.price(g)
    const tentCount = item.id === 'tent_bundle' ? Math.max(1, Math.ceil(g / 100)) : null
    return {
      id: item.id,
      label: item.label,
      unit: item.unit,
      qty: item.id === 'tent_bundle' ? 1 : qty,
      tents: tentCount,
      low: round(item.id === 'tent_bundle' ? eachLow : eachLow * qty),
      high: round(item.id === 'tent_bundle' ? eachHigh : eachHigh * qty),
      from: Boolean(item.from),
      optional: Boolean(item.optional),
      why: item.why,
      vendor: HIRE_VENDORS[item.vendor],
    }
  })
  const usual = items.filter((i) => !i.optional)
  return {
    guests: g,
    items,
    usualLow: round(usual.reduce((s, i) => s + i.low, 0)),
    usualHigh: round(usual.reduce((s, i) => s + i.high, 0)),
  }
}

// The cost line a hire item becomes when the family adds it to the budget:
// priced at the middle of its range, as a guide only.
export function hireCostLine(itemId, guests) {
  const item = hirePlan(guests).items.find((i) => i.id === itemId)
  if (!item) return null
  return {
    phase: 'HIRE',
    label: `Hire: ${item.label}`,
    category: 'hire',
    unit: item.unit,
    quantity: 1,
    unitCost: round((item.low + item.high) / 2),
    isInputField: true,
    inputType: 'number',
    suggestedAmount: `R${Math.round(item.low).toLocaleString('en-ZA')}–R${Math.round(item.high).toLocaleString('en-ZA')} (${item.vendor.name})`,
  }
}
