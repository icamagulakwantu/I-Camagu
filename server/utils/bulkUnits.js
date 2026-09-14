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
  sack: ['sack', 'sacks'],
  tub: ['tub', 'tubs'],
  kg: ['kg', 'kg'],
  // "each" is how a supplier quotes it, but "Add each" reads badly on a
  // button — "item" says the same thing in the user's language.
  each: ['item', 'items'],
};

// Drinks always come in cases, whatever the product happens to be called.
// Checked before any name rule so a beer like "Castle Milk Stout" can't be
// caught by the rule meant for a 2L bottle of milk — which is exactly what
// happened the first time this ran.
const CASE_CATEGORIES = new Set([
  'BEER', 'BRANDY', 'CHAMPAGNE', 'CIDER_RTD', 'COGNAC', 'GIN', 'LIQUEUR',
  'SPARKLING', 'TEQUILA', 'TEQUILA_PREMIUM', 'VODKA', 'VODKA_PREMIUM',
  'WHISKY', 'WINE', 'WINE_BOX', 'MIXER', 'SOFT_DRINKS', 'WATER',
]);

// Matched in order — the first rule that fits wins, so specific product
// names beat broad category rules.
const RULES = [
  // --- Live animals: sold per head, never per case ---
  { category: 'LIVESTOCK_ANIMAL', unit: 'head' },

  // --- Fresh produce: the real market units ---
  // Onions/potatoes/carrots keep the real fresh-produce-market term for a
  // 10kg mesh sack. Everything else in this category sells in a box, per
  // the founder's own instruction ("all vegetables boxes or sacks") — no
  // more per-head or per-bundle framing for a bulk buyer.
  { name: /\bonions?\b/i, unit: 'pocket' },
  { name: /\bpotato(es)?\b/i, unit: 'pocket' },
  { name: /\bcarrots?\b/i, unit: 'pocket' },
  // Peppers and apples were priced by weight in the old catalogue ("per kg").
  { name: /\bper kg\b/i, unit: 'kg' },
  { category: 'FRESH_PRODUCE', unit: 'box' },

  // --- Meat ---
  // Trays and legs are sold as a box/sack, not "N birds" — check these
  // before the generic chicken rule, which is for the whole-bird row.
  { name: /chicken (trays?|pieces)/i, unit: 'box' },
  { name: /chicken legs?/i, unit: 'sack' },
  { name: /\bchicken\b/i, unit: 'bird' },
  { name: /carcass|hindquarter|\bside\b/i, unit: 'carcass' },
  { category: 'MEAT', unit: 'pack' },

  // --- Dry goods and groceries ---
  { name: /maize meal|\bflour\b|\bsugar\b|\brice\b|\bsamp\b|\bbeans? 10kg\b|amazimba|umbona/i, unit: 'bag' },
  { name: /\bbread\b/i, unit: 'loaf' },
  { name: /peanut butter|\bjam\b/i, unit: 'jar' },
  { name: /instant coffee/i, unit: 'tin' },
  { name: /\btea\b.*bags?|\btea\b.*box/i, unit: 'box' },
  { name: /mayonnaise|\bchutney\b|chilli sauce|chili sauce/i, unit: 'tub' },
  { name: /beef stock|\bsalt\b/i, unit: 'box' },
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

  // --- Clothing: sold per garment, not per case ---
  { category: 'CLOTHING', unit: 'each' },
];

// Everything else — all the alcohol categories, mixers, soft drinks — really
// does come in cases, which is the default.
export function resolveBulkUnit(sku) {
  if (CASE_CATEGORIES.has(sku.category)) return 'case';
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
