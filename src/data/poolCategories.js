// Mirrors server/controllers/poolController.js's CATEGORY_LABEL — a pool's
// category (same enum as Partner.type) says what it's for, independent of
// whether a confirmed supplier is attached to it yet.
export const CATEGORY_LABEL = {
  TAVERN: 'Drinks',
  BUTCHERY: 'Meat & livestock',
  GROCERY: 'Groceries & other items',
  PRODUCE: 'Fresh produce',
}

// Mirrors categoryForSku on the server: which kind of pool an item goes into.
const TAVERN_SKU_CATEGORIES = new Set([
  'BEER', 'CIDER_RTD', 'BRANDY', 'WHISKY', 'VODKA', 'VODKA_PREMIUM', 'GIN', 'TEQUILA', 'TEQUILA_PREMIUM', 'COGNAC', 'LIQUEUR', 'MIXER',
  'WINE', 'WINE_BOX', 'SPARKLING', 'CHAMPAGNE', 'SOFT_DRINKS', 'WATER',
])
const BUTCHERY_SKU_CATEGORIES = new Set(['LIVESTOCK_ANIMAL', 'MEAT'])

export function poolCategoryForSku(sku) {
  if (TAVERN_SKU_CATEGORIES.has(sku?.category)) return 'TAVERN'
  if (BUTCHERY_SKU_CATEGORIES.has(sku?.category)) return 'BUTCHERY'
  if (sku?.category === 'FRESH_PRODUCE') return 'PRODUCE'
  return 'GROCERY'
}
