// What one buying unit of a product is actually called in South African
// trade. "Case" is correct for alcohol and tinned goods and wrong for
// almost everything else — you buy onions by the 10kg pocket (the term
// Red Star Wholesale and the fresh-produce markets use), maize meal by the
// bag, and live animals per head. Calling a live goat "1 case" makes the
// Store look like it was written by someone who has never bought one.
//
// Collective nouns (a herd of cattle, a flock of sheep) describe the group,
// not the unit of sale — you still buy cattle per head, so "head" is what
// belongs on a price and a pool counter.

export const UNITS = {
  case: ['case', 'cases'],
  head: ['head', 'head'], // "9 of 12 head" — head is both singular and plural
  pocket: ['pocket', 'pockets'],
  bag: ['bag', 'bags'],
  bundle: ['bundle', 'bundles'],
  crate: ['crate', 'crates'],
  box: ['box', 'boxes'],
  pack: ['pack', 'packs'],
  tin: ['tin', 'tins'],
  jar: ['jar', 'jars'],
  bottle: ['bottle', 'bottles'],
  loaf: ['loaf', 'loaves'],
  carcass: ['carcass', 'carcasses'],
  bird: ['bird', 'birds'],
  kg: ['kg', 'kg'],
  // "each" is how a supplier quotes it, but "Add each" reads badly on a
  // button — "item" says the same thing in the user's language.
  each: ['item', 'items'],
};

// Matched in order — the first rule that fits wins, so specific product
// names beat broad category rules.
const RULES = [
  // --- Live animals: sold per head, never per case ---
  { category: 'LIVESTOCK_ANIMAL', unit: 'head' },

  // --- Fresh produce: the real market units ---
  { name: /\bonions?\b/i, unit: 'pocket' },
  { name: /\bpotato(es)?\b/i, unit: 'pocket' },
  { name: /\bcarrots?\b/i, unit: 'pocket' },
  { name: /\bcabbage\b/i, unit: 'head' },
  { name: /\bspinach\b/i, unit: 'bundle' },
  // Peppers and apples are priced by weight in the catalogue ("per kg").
  { name: /\bper kg\b/i, unit: 'kg' },
  { category: 'FRESH_PRODUCE', unit: 'crate' },

  // --- Meat ---
  { name: /\bchicken\b/i, unit: 'bird' },
  { name: /carcass|hindquarter|\bside\b/i, unit: 'carcass' },
  { category: 'MEAT', unit: 'pack' },

  // --- Dry goods and groceries ---
  { name: /maize meal|\bflour\b|\bsugar\b|\brice\b|\bsamp\b|\bbeans? 10kg\b/i, unit: 'bag' },
  { name: /\bbread\b/i, unit: 'loaf' },
  { name: /peanut butter|\bjam\b/i, unit: 'jar' },
  { name: /instant coffee/i, unit: 'tin' },
  { name: /\btea\b.*bags?/i, unit: 'box' },
  { name: /\bmilk\b|cooking oil/i, unit: 'bottle' },
  { name: /\bbutter\b/i, unit: 'each' },
  { category: 'CANNED_GOODS', unit: 'tin' },
  { category: 'GROCERY_BULK', unit: 'bag' },
  { category: 'GROCERY', unit: 'each' },
  { category: 'DRY_GOODS', unit: 'each' },

  // --- Ritual and ulwaluko supplies ---
  { name: /imphepho|pole bundle|\bpoles?\b/i, unit: 'bundle' },
  { name: /blanket|tarpaulin|sail|container|\bclay\b|\bikoto\b/i, unit: 'each' },
  { category: 'RITUAL_SUPPLIES', unit: 'each' },
  { category: 'ULWALUKO_SUPPLIES', unit: 'each' },
];

// Everything else — all the alcohol categories, mixers, soft drinks — really
// does come in cases, which is the default.
export function resolveBulkUnit(sku) {
  for (const rule of RULES) {
    if (rule.category && sku.category !== rule.category) continue;
    if (rule.name && !rule.name.test(sku.name || '')) continue;
    if (rule.category || rule.name) return rule.unit;
  }
  return 'case';
}

export function labelsFor(unitKey) {
  const [singular, plural] = UNITS[unitKey] || UNITS.case;
  return { bulkUnit: singular, bulkUnitPlural: plural };
}
