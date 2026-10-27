/**
 * Store taxonomy — one hierarchy, two levels, no competing chip rows.
 *
 *   department (Alcohol | Soft drinks & water | Meat | Livestock | Groceries | Non-consumables)
 *     └── aisle (Beer & cider, Spirits, Meat & poultry, Live animals, …)
 *
 * Maps the real backend `Sku.category` codes (MEAT, LIVESTOCK_ANIMAL,
 * SOFT_DRINKS, WHISKY, …) into a human aisle instead of rendering the raw
 * codes as a flat wall of pills. Display-layer only — no schema change
 * (Sku.category is a plain string, not a DB enum).
 *
 * Departments are split by the way people shop: alcohol never shares a default list with soft drinks or water, and live animals are separate from meat. Non-consumables are separated from groceries.
 * Six departments, in this order, per the founder's call: alcohol and
 * food used to sit under one merged "Staples & Dry Goods" department
 * alongside a separate "Vegetables" one — now Groceries and Supplies
 * (ceremony/ritual items) are their own top-level departments, fresh
 * produce folds into Groceries, and Clothing is a new department shell
 * (no real SKUs yet — same "the tab exists ahead of the catalogue"
 * pattern already used for supplier categories with zero partners on
 * file) ready for when clothing items are added.
 */

export const DEPARTMENTS = [
  {
    id: 'alcohol',
    name: 'Alcohol',
    short: 'Alcohol',
    xhosa: 'Utywala',
    aisles: [
      { id: 'beer', name: 'Beer & cider', categories: ['BEER', 'CIDER_RTD'] },
      { id: 'spirits', name: 'Spirits', categories: ['BRANDY', 'WHISKY', 'VODKA', 'VODKA_PREMIUM', 'GIN', 'TEQUILA', 'TEQUILA_PREMIUM', 'COGNAC', 'LIQUEUR', 'MIXER'] },
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
]

export function departmentOf(sku) {
  return DEPARTMENTS.find((d) => d.aisles.some((a) => a.categories.includes(sku?.category)))
    || DEPARTMENTS.find((d) => d.id === 'groceries')
}

export function aisleOf(sku) {
  const department = departmentOf(sku)
  return department.aisles.find((a) => a.categories.includes(sku?.category)) || department.aisles[0]
}
