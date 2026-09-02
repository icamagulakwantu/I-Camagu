/**
 * Store taxonomy — one hierarchy, two levels, no competing chip rows.
 *
 *   department (Meat & Livestock | Staples & Dry Goods | Beverages)
 *     └── aisle (Live animals, Meat & poultry, Spirits, Wine, …)
 *
 * Maps the real backend `Sku.category` codes (MEAT, LIVESTOCK_ANIMAL,
 * SOFT_DRINKS, WHISKY, …) into a human aisle instead of rendering the raw
 * codes as a flat wall of pills. Display-layer only — no schema change.
 */

export const DEPARTMENTS = [
  {
    id: 'meat',
    name: 'Meat & Livestock',
    short: 'Meat',
    xhosa: 'Inyama',
    aisles: [
      { id: 'livestock', name: 'Live animals', categories: ['LIVESTOCK_ANIMAL'] },
      { id: 'meat', name: 'Meat & poultry', categories: ['MEAT'] },
    ],
  },
  {
    id: 'staples',
    name: 'Staples & Dry Goods',
    short: 'Staples',
    xhosa: 'Ukutya',
    aisles: [
      { id: 'grains', name: 'Grains & dry goods', categories: ['DRY_GOODS', 'GROCERY_BULK', 'GROCERY'] },
      { id: 'tinned', name: 'Tinned goods', categories: ['CANNED_GOODS'] },
      { id: 'produce', name: 'Fresh produce', categories: ['FRESH_PRODUCE'] },
      { id: 'ritual', name: 'Ceremony supplies', categories: ['RITUAL_SUPPLIES', 'ULWALUKO_SUPPLIES'] },
    ],
  },
  {
    id: 'beverages',
    name: 'Beverages',
    short: 'Drinks',
    xhosa: 'Iziselo',
    aisles: [
      { id: 'beer', name: 'Beer & cider', categories: ['BEER', 'CIDER_RTD'] },
      { id: 'spirits', name: 'Spirits', categories: ['BRANDY', 'WHISKY', 'VODKA', 'VODKA_PREMIUM', 'GIN', 'TEQUILA', 'TEQUILA_PREMIUM', 'COGNAC', 'LIQUEUR', 'MIXER'] },
      { id: 'wine', name: 'Wine & sparkling', categories: ['WINE', 'WINE_BOX', 'SPARKLING', 'CHAMPAGNE'] },
      { id: 'soft', name: 'Soft drinks & water', categories: ['SOFT_DRINKS', 'WATER'] },
    ],
  },
]

export function departmentOf(sku) {
  return DEPARTMENTS.find((d) => d.aisles.some((a) => a.categories.includes(sku?.category))) || DEPARTMENTS[1]
}

export function aisleOf(sku) {
  const department = departmentOf(sku)
  return department.aisles.find((a) => a.categories.includes(sku?.category)) || department.aisles[0]
}
