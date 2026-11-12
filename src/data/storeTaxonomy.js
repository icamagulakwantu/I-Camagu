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

// A section is a finer shelf inside an aisle (Whisky inside Spirits). An
// aisle's categories are always the union of its sections, so code that only
// knows aisles keeps working.
const withSections = (aisle) => ({
  ...aisle,
  categories: aisle.sections.flatMap((section) => section.categories),
})

// image: one real product photo for the department tile (a packshot on
// white, or a photograph). One product per tile: pairs of products at
// different real sizes looked wrong side by side.
export const DEPARTMENTS = [
  {
    id: 'alcohol',
    name: 'Alcohol',
    short: 'Alcohol',
    xhosa: 'Utywala',
    image: '/images/brands/hennessy-xo.png',
    aisles: [
      { id: 'beer', name: 'Beer', categories: ['BEER'] },
      { id: 'ciders', name: 'Ciders & coolers', categories: ['CIDER_RTD'] },
      withSections({
        id: 'spirits',
        name: 'Spirits',
        sections: [
          { id: 'whisky', name: 'Whisky', categories: ['WHISKY'] },
          { id: 'brandy', name: 'Brandy', categories: ['BRANDY'] },
          { id: 'cognac', name: 'Cognac', categories: ['COGNAC'] },
          { id: 'gin', name: 'Gin', categories: ['GIN'] },
          { id: 'vodka', name: 'Vodka', categories: ['VODKA', 'VODKA_PREMIUM'] },
          { id: 'rum', name: 'Rum', categories: ['RUM'] },
          { id: 'tequila', name: 'Tequila', categories: ['TEQUILA', 'TEQUILA_PREMIUM'] },
        ],
      }),
      { id: 'liqueurs', name: 'Liqueurs', categories: ['LIQUEUR'] },
      withSections({
        id: 'wine',
        name: 'Wine & bubbly',
        sections: [
          { id: 'wine-bottles', name: 'Wine', categories: ['WINE'] },
          { id: 'wine-boxes', name: 'Boxed wine', categories: ['WINE_BOX'] },
          { id: 'bubbly', name: 'Sparkling & champagne', categories: ['SPARKLING', 'CHAMPAGNE'] },
        ],
      }),
    ],
  },
  {
    id: 'softdrinks',
    name: 'Soft drinks, water & mixers',
    short: 'Soft drinks',
    xhosa: 'Iziselo ezinganxilisiyo',
    image: '/images/brands/images%20(9).jpeg',
    aisles: [
      { id: 'soft', name: 'Soft drinks', categories: ['SOFT_DRINKS', 'JUICE', 'ENERGY_DRINK'] },
      { id: 'water', name: 'Water & ice', categories: ['WATER', 'ICE'] },
      { id: 'mixers', name: 'Mixers & cordials', categories: ['MIXER'] },
    ],
  },
  {
    id: 'meat',
    name: 'Meat & poultry',
    short: 'Meat',
    xhosa: 'Inyama',
    // Founder's own photo (30 Oct round), as on the Whole Chicken product.
    image: 'https://hercules-cdn.com/file_XPFTde3NRaR0itfh1NJ8HuQ2',
    aisles: [
      { id: 'meat', name: 'Meat & poultry', categories: ['MEAT'] },
    ],
  },
  {
    id: 'livestock',
    name: 'Livestock',
    short: 'Livestock',
    xhosa: 'Imfuyo',
    image: '/images/brands/images%20(11).jpeg',
    aisles: [
      { id: 'livestock', name: 'Live animals', categories: ['LIVESTOCK_ANIMAL'] },
    ],
  },
  {
    id: 'groceries',
    name: 'Groceries',
    short: 'Groceries',
    xhosa: 'Ukutya',
    image: '/images/brands/baked-beans.jpg',
    aisles: [
      { id: 'grains', name: 'Grains & dry goods', categories: ['DRY_GOODS', 'GROCERY_BULK', 'GROCERY'] },
      { id: 'tinned', name: 'Tinned goods', categories: ['CANNED_GOODS'] },
      { id: 'produce', name: 'Fresh produce', categories: ['FRESH_PRODUCE'] },
    ],
  },
  {
    id: 'nonconsumables',
    name: 'Ceremony & household',
    short: 'Ceremony & home',
    xhosa: 'Izinto zomsitho',
    image: 'https://hercules-cdn.com/file_wWg6TY8EOXaauUnyTSlRBPwZ',
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

// The finer shelf inside an aisle (Whisky inside Spirits), or null.
export function sectionOf(sku) {
  const category = categoryCodeOf(sku)
  return aisleOf(sku).sections?.find((section) => section.categories.includes(category)) || null
}
