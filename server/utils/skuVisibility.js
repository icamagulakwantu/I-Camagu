// One rule, one place: what a member is allowed to be told a shop charges.
//
// retailPriceZAR drives every savings figure in the app — the per-product
// comparison in the Store and the basket total. If an unchecked number
// reaches those screens, iCamagu tells a family it saved them money it
// cannot prove. So the price only leaves the server when somebody actually
// verified it against a named shop.
//
// Estimates still have a job. Margin work, spotting products we've priced
// above the shop, planning — all of that runs fine on a modelled number, and
// the admin screens get the full picture. They just never become a claim.

export const RETAIL_VERIFIED = 'VERIFIED';
export const RETAIL_ESTIMATE = 'ESTIMATE';
export const RETAIL_SOURCES = [RETAIL_VERIFIED, RETAIL_ESTIMATE];
export const RETAIL_VERIFICATION_MAX_AGE_MS = 42 * 24 * 60 * 60 * 1000;

export function isVerifiedRetail(sku, now = Date.now()) {
  if (sku?.retailPriceSource !== RETAIL_VERIFIED || sku?.retailPriceZAR == null || !sku?.retailPriceCheckedAt) return false;
  const checkedAt = new Date(sku.retailPriceCheckedAt).getTime();
  const age = now - checkedAt;
  return Number.isFinite(checkedAt) && age >= 0 && age <= RETAIL_VERIFICATION_MAX_AGE_MS;
}

// A SKU can be catalogued — name, pack format, category all real — before
// anyone has actually been to Makro/Food Lover's to price it. casePriceZAR
// null means exactly that: real product, no invented member price. Nothing
// downstream (Store's Add button, the basket-add endpoint) treats it as
// purchasable until this is true.
export function isOrderable(sku) {
  return sku?.casePriceZAR != null;
}

// Strips the retail price from a catalogue row unless it has been verified,
// and drops the provenance fields — a member has no use for them. Returns a
// new object; never mutates the row Prisma handed us.
export function toPublicSku(sku) {
  const { retailPriceSource, retailPriceCheckedAt, retailPriceNote, ...rest } = sku;
  return {
    ...rest,
    retailPriceZAR: isVerifiedRetail(sku) ? sku.retailPriceZAR : null,
  };
}

// What a member's browser is allowed to receive about a product.
//
// The catalogue endpoint learned this lesson once already: `findMany` with no
// select returned every column, so costPriceZAR would have shipped to every
// browser the moment that column existed. The basket endpoint had the same
// hole via `include: { sku: true }` — Prisma returns all scalars there too.
// Both now go through this one list, so a new sensitive column is excluded by
// default rather than by anyone remembering to exclude it.
export const PUBLIC_SKU_SELECT = {
  id: true, name: true, category: true, productType: true,
  bottleFormat: true, unitsPerCase: true, casePriceZAR: true,
  palletPackQty: true, palletPriceZAR: true, supplierPortfolio: true,
  imageUrl: true, retailPriceZAR: true, retailPriceSource: true,
  bulkUnit: true, bulkUnitPlural: true, createdAt: true,
};

// A basket item carries its SKU, so it needs the same treatment.
export function toPublicItem(item) {
  return item?.sku ? { ...item, sku: toPublicSku(item.sku) } : item;
}
