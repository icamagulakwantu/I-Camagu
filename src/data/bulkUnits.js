// Reads the unit a product is actually bought in, as classified on the Sku
// itself (see server/utils/bulkUnits.js). Falls back to "case" so anything
// unclassified reads exactly as it did before.
export function unitOf(sku) {
  return sku?.bulkUnit || 'case'
}

export function unitOfPlural(sku, quantity) {
  if (quantity === 1) return unitOf(sku)
  return sku?.bulkUnitPlural || 'cases'
}

// "3 pockets", "1 head", "12 cases" — the quantity with its correct unit.
export function quantityLabel(sku, quantity) {
  return `${quantity} ${unitOfPlural(sku, quantity)}`
}

// You buy livestock per head, but a group of them has its own name — and the
// names differ by animal. Cattle and goats form a HERD; sheep form a FLOCK.
// Returns null for anything that isn't a live animal, so nothing else picks
// up an animal word by accident.
export function collectiveNoun(sku) {
  if (unitOf(sku) !== 'head') return null
  const name = (sku?.name || '').toLowerCase()
  if (sku?.category !== 'LIVESTOCK_ANIMAL') return null // cabbage is also sold per head
  if (/sheep|gusha|hlama/.test(name)) return 'flock'
  return 'herd' // cattle, oxen, goats
}
