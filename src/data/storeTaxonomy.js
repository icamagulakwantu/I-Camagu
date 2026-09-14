/**
 * Store taxonomy — one hierarchy, two levels, no competing chip rows.
 *
 *   department (Drinks | Meat | Groceries | Supplies | Clothing)
 *     └── aisle (Live animals, Meat & poultry, Spirits, Wine, …)
 *
 * Maps the real backend `Sku.category` codes (MEAT, LIVESTOCK_ANIMAL,
 * SOFT_DRINKS, WHISKY, …) into a human aisle instead of rendering the raw
 * codes as a flat wall of pills. Display-layer only — no schema change
 * (Sku.category is a plain string, not a DB enum).
 *
 * Five departments, in this order, per the founder's call: alcohol and
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
    id: 'beverages',
    name: 'Drinks',
    short: 'Drinks',
    xhosa: 'Iziselo',
    aisles: [
      { id: 'beer', name: 'Beer & cider', categories: ['BEER', 'CIDER_RTD'] },
      { id: 'spirits', name: 'Spirits', categories: ['BRANDY', 'WHISKY', 'VODKA', 'VODKA_PREMIUM', 'GIN', 'TEQUILA', 'TEQUILA_PREMIUM', 'COGNAC', 'LIQUEUR', 'MIXER'] },
      { id: 'wine', name: 'Wine & sparkling', categories: ['WINE', 'WINE_BOX', 'SPARKLING', 'CHAMPAGNE'] },
      { id: 'soft', name: 'Soft drinks & water', categories: ['SOFT_DRINKS', 'WATER'] },
    ],
  },
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
    id: 'supplies',
    name: 'Supplies',
    short: 'Supplies',
    xhosa: 'Izixhobo',
    aisles: [
      { id: 'ritual', name: 'Ceremony supplies', categories: ['RITUAL_SUPPLIES', 'ULWALUKO_SUPPLIES'] },
    ],
  },
  {
    id: 'clothing',
    name: 'Clothing',
    short: 'Clothing',
    xhosa: 'Impahla',
    aisles: [
      { id: 'general', name: 'General clothing', categories: ['CLOTHING'] },
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
