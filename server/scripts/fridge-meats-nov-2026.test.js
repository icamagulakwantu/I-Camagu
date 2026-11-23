import { describe, expect, it } from 'vitest';
import { FRIDGE_PRODUCTS } from './fridge-meats-nov-2026.js';
import { MIN_SAVING } from './bulk-below-shelf.js';
import { FRIDGE_BASKET } from '../../shared/examples.js';

describe('fridge meats for Bulk Buy', () => {
  it('every product has a bulk price, a shelf price, both sources and a photo', () => {
    for (const p of FRIDGE_PRODUCTS) {
      expect(p.casePriceZAR, p.name).toBeGreaterThan(0);
      expect(p.retailPriceZAR, p.name).toBeGreaterThan(0);
      expect(['VERIFIED', 'ESTIMATE']).toContain(p.retailPriceSource);
      expect(p.bulkSource && p.retailSource && p.slug && p.photo, p.name).toBeTruthy();
    }
  });
  it('a checked shelf price is always at least 5% above the bulk price', () => {
    for (const p of FRIDGE_PRODUCTS.filter((x) => x.retailPriceSource === 'VERIFIED')) {
      expect(p.casePriceZAR, p.name).toBeLessThanOrEqual(p.retailPriceZAR * (1 - MIN_SAVING));
    }
  });
  it('the Fridge stokvel example uses the Bulk Buy prices, and shop prices only where checked', () => {
    expect(FRIDGE_BASKET).toHaveLength(FRIDGE_PRODUCTS.length);
    FRIDGE_BASKET.forEach((b, i) => {
      const p = FRIDGE_PRODUCTS[i];
      expect(b.casePrice, p.name).toBe(p.casePriceZAR);
      expect(b.shop, p.name).toBe(p.retailPriceSource === 'VERIFIED' ? p.retailPriceZAR : null);
    });
  });
});
