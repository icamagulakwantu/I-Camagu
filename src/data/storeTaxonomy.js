/**
 * Store taxonomy — one hierarchy, two levels, no competing chip rows.
 *
 *   department (Alcohol | Soft drinks & water | Meat | Livestock | Groceries | Non-consumables | Other items)
 *     └── aisle (Beer & cider, Spirits, Meat & poultry, Live animals, …)
 *
 * Maps the real backend `Sku.category` codes (MEAT, LIVESTOCK_ANIMAL,
 * SOFT_DRINKS, WHISKY, …) into a human aisle instead of rendering the raw
 * codes as a flat wall of pills. Display-layer only — no schema change
 * (Sku.category is a plain string, not a DB enum).
 *
 * Departments are split by the way people shop: alcohol never shares a default list with soft drinks or water, and live animals are separate from meat. Non-consumables are separated from groceries.
 * Unmapped category codes are deliberately routed to Other items instead of
 * being silently presented as groceries. Review these SKUs and map them to a
 * proper department as part of catalogue maintenance.
 */

export const DEPARTMENTS = [
  {
    id: 'alcohol',
    name: 'Alcohol',
    short: 'Alcohol',
    xhosa: 'Utywala',
    aisles: [
      { id: 'beer', name: 'Beer & cider', categories: ['BEER', 'CIDER_RTD'] },
      { id: 'spirits', name: 'Spirits', categories: ['BRANDY', 'WHISKY', 'VODKA', 'VODKA_PREMIUM', 'GIN', 'TEQUILA', 'TEQUILA_PREMIUM', 'COGNAC', 'LIQUEUR'] },
      { id: 'wine', name: 'Wine & sparkling', categories: ['WINE', 'WINE_BOX', 'SPARKLING', 'CHAMPAGNE'] },
    ],
  },
  {
    id: 'softdrinks',
    name: 'Soft drinks & water',
    short: 'Soft drinks',
    xhosa: 'Iziselo ezinganxilisiyo',
    aisles: [
      { id: 'soft', name: 'Soft drinks & water', categories: ['SOFT_DRINKS', 'WATER', 'JUICE', 'ENERGY_DRINK'] },
      { id: 'mixers', name: 'Mixers & tonic', categories: ['MIXER'] },
    ],
  },
  {
    id: 'meat',
    name: 'Meat & poultry',
    short: 'Meat',
    xhosa: 'Inyama',
    aisles: [
      { id: 'meat', name: 'Meat & poultry', categories: ['MEAT'] },
    ],
  },
  {
    id: 'livestock',
    name: 'Livestock',
    short: 'Livestock',
    xhosa: 'Imfuyo',
    aisles: [
      { id: 'livestock', name: 'Live animals', categories: ['LIVESTOCK_ANIMAL'] },
    ],
  },
  {
    id: 'groceries',
    name: 'Groceries',
    short: 'Groceries',
    xhosa: 'Ukutya',
    aisles: [
      { id: 'grains', name: 'Grains & dry goods', categories: ['DRY_GOODS', 'GROCERY_BULK', 'GROCERY'] },
      { id: 'tinned', name: 'Tinned goods', categories: ['CANNED_GOODS'] },
      { id: 'produce', name: 'Fresh produce', categories: ['FRESH_PRODUCE'] },
    ],
  },
  {
    id: 'nonconsumables',
    name: 'Non-consumables',
    short: 'Non-consumables',
    xhosa: 'Izinto ezingatyiwayo',
    aisles: [
      { id: 'ritual', name: 'Ceremony & household supplies', categories: ['RITUAL_SUPPLIES', 'ULWALUKO_SUPPLIES', 'NON_CONSUMABLE', 'NON_CONSUMABLES', 'HOUSEHOLD', 'CLEANING', 'HYGIENE', 'CLOTHING', 'TOOLS'] },
    ],
  },
  {
    id: 'other',
    name: 'Other items',
    short: 'Other',
    xhosa: 'Ezinye izinto',
    aisles: [
      { id: 'review', name: 'Other items', categories: ['OTHER', 'UNCATEGORIZED', 'MISC', 'MISCELLANEOUS', 'GENERAL'] },
    ],
  },
]

// Backend category strings are not constrained by a database enum. Normalise
// harmless casing/whitespace differences so a value such as " water " cannot
// fall through to Other items or evade the intended department filter.
export function categoryCodeOf(sku) {
  return String(sku?.category ?? '').trim().toUpperCase()
}

export function departmentOf(sku) {
  const category = categoryCodeOf(sku)
  return DEPARTMENTS.find((d) => d.aisles.some((a) => a.categories.includes(category)))
    || DEPARTMENTS.find((d) => d.id === 'other')
}

export function aisleOf(sku) {
  const category = categoryCodeOf(sku)
  const department = departmentOf(sku)
  return department.aisles.find((a) => a.categories.includes(category)) || department.aisles[0]
}
