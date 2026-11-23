import { describe, expect, it } from 'vitest';
import { cappedPrice } from './bulk-below-shelf.js';

describe('bulk is always below the shelf price', () => {
  it('brings a price at or above 95% of the shelf down to 95%', () => {
    expect(cappedPrice(279.36, 229.99)).toBe(218.49);
    expect(cappedPrice(1843.2, 1799)).toBe(1709.05);
    expect(cappedPrice(269.94, 269.94)).toBe(256.44);
  });
  it('leaves a price already 5% or more below alone, and never raises', () => {
    expect(cappedPrice(2188.8, 2400)).toBeNull();
    expect(cappedPrice(100, null)).toBeNull();
  });
});
