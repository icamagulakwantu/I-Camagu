import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NEW_PRODUCTS, PHOTOS, PRICE_UPDATES } from './drinks-photos-prices-nov-2026.js';

const exists = (url) => existsSync(new URL(`../../public${url}`, import.meta.url));

describe('drinks photos and prices', () => {
  it('every photo exists', () => {
    for (const [, , file] of PHOTOS) expect(exists(`/images/brands/drinks/${file}.webp`)).toBe(true);
    for (const p of NEW_PRODUCTS) expect(exists(p.imageUrl)).toBe(true);
  });
  it('never lists a bulk price above its shop price, and names a source', () => {
    for (const [, , bulk, retail, source] of PRICE_UPDATES) {
      if (retail != null) expect(bulk).toBeLessThanOrEqual(retail);
      expect(source.length).toBeGreaterThan(10);
    }
    for (const p of NEW_PRODUCTS) {
      if (p.retailPriceZAR != null) expect(p.casePriceZAR).toBeLessThanOrEqual(p.retailPriceZAR);
      expect(p.source.length).toBeGreaterThan(10);
    }
  });
});
