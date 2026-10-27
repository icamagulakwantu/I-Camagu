import { describe, expect, it } from 'vitest';
import {
  isVerifiedRetail,
  toPublicSku,
  RETAIL_VERIFICATION_MAX_AGE_MS,
} from './skuVisibility.js';

describe('retail price freshness', () => {
  const now = Date.parse('2026-10-27T12:00:00.000Z');
  const current = {
    id: 'sku-1',
    retailPriceZAR: '100.00',
    retailPriceSource: 'VERIFIED',
    retailPriceCheckedAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
    retailPriceNote: 'Checked at a named retailer',
  };

  it('allows a recently verified comparison', () => {
    expect(isVerifiedRetail(current, now)).toBe(true);
    expect(toPublicSku(current).retailPriceZAR).toBe('100.00');
  });

  it('hides comparisons older than 42 days or without a check date', () => {
    expect(isVerifiedRetail({
      ...current,
      retailPriceCheckedAt: new Date(now - RETAIL_VERIFICATION_MAX_AGE_MS - 1),
    }, now)).toBe(false);
    expect(isVerifiedRetail({ ...current, retailPriceCheckedAt: null }, now)).toBe(false);
    expect(toPublicSku({ ...current, retailPriceCheckedAt: null }).retailPriceZAR).toBeNull();
  });

  it('does not accept future-dated verification timestamps', () => {
    expect(isVerifiedRetail({ ...current, retailPriceCheckedAt: new Date(now + 1000) }, now)).toBe(false);
  });
});
