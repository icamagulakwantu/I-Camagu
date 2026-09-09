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
