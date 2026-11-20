import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EKOYINI_PRODUCTS } from './ekoyini-catalogue-nov-2026.js';

describe('Ekoyini catalogue products', () => {
  it('never lists a bulk price above the verified shop price', () => {
    for (const p of EKOYINI_PRODUCTS) {
      expect(p.casePriceZAR).toBeGreaterThan(0);
      if (p.retailPriceZAR != null) expect(p.casePriceZAR).toBeLessThanOrEqual(p.retailPriceZAR);
    }
  });
  it('has a named source, a real pack size and a photo that exists', () => {
    const keys = new Set();
    for (const p of EKOYINI_PRODUCTS) {
      expect(p.source.length).toBeGreaterThan(10);
      expect(p.unitsPerCase).toBeGreaterThan(0);
      const key = `${p.name}|${p.bottleFormat}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
      if (p.imageUrl) expect(existsSync(new URL(`../../public${p.imageUrl}`, import.meta.url))).toBe(true);
    }
  });
});
