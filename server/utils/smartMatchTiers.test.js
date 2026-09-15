import { describe, it, expect } from 'vitest';
import {
  PALLET_CASES,
  DEFAULT_PALLET_TIERS,
  palletsForCases,
  resolveTierLadder,
  getTierForMetric,
  getNextTierForMetric,
  amountToReachTier,
} from './smartMatchTiers.js';

describe('palletsForCases', () => {
  it('converts cases to pallets using the real 56-case pallet size', () => {
    expect(palletsForCases(56)).toBe(1);
    expect(palletsForCases(112)).toBe(2);
    expect(palletsForCases(28)).toBe(0.5);
  });
});

describe('resolveTierLadder', () => {
  it('returns a founder-entered tierLadder, sorted by min ascending', () => {
    const pool = { tierBasis: 'AMOUNT', tierLadder: [{ id: 2, name: 'B', min: 500 }, { id: 1, name: 'A', min: 100 }] };
    const ladder = resolveTierLadder(pool);
    expect(ladder.map((t) => t.min)).toEqual([100, 500]);
  });

  it('falls back to the standard alcohol pallet bands when no real ladder exists yet', () => {
    const pool = { tierBasis: 'PALLETS', tierLadder: null };
    expect(resolveTierLadder(pool)).toBe(DEFAULT_PALLET_TIERS);
  });

  it('defaults to PALLETS when tierBasis is unset', () => {
    const pool = { tierLadder: null };
    expect(resolveTierLadder(pool)).toBe(DEFAULT_PALLET_TIERS);
  });

  it('never fabricates an AMOUNT ladder — returns null instead of a guessed default', () => {
    const pool = { tierBasis: 'AMOUNT', tierLadder: null };
    expect(resolveTierLadder(pool)).toBeNull();
  });

  it('treats an empty tierLadder array as "not set yet", not a real ladder', () => {
    const pool = { tierBasis: 'PALLETS', tierLadder: [] };
    expect(resolveTierLadder(pool)).toBe(DEFAULT_PALLET_TIERS);
  });
});

describe('getTierForMetric', () => {
  const ladder = [
    { id: 1, name: 'Amazibazana Goal', min: 1 },
    { id: 2, name: 'Clan Tier', min: 4 },
    { id: 3, name: 'Eastern Cape Tier', min: 8 },
    { id: 4, name: 'Max Tier', min: 10 },
  ];

  it('returns null when the metric has not reached the first tier', () => {
    expect(getTierForMetric(0.5, ladder)).toBeNull();
  });

  it('returns the highest tier reached, not just the first one crossed', () => {
    expect(getTierForMetric(9, ladder).name).toBe('Eastern Cape Tier');
    expect(getTierForMetric(10, ladder).name).toBe('Max Tier');
    expect(getTierForMetric(100, ladder).name).toBe('Max Tier');
  });

  it('returns null when there is no ladder at all', () => {
    expect(getTierForMetric(5, null)).toBeNull();
  });
});

describe('getNextTierForMetric / amountToReachTier', () => {
  const ladder = [{ id: 1, name: 'First', min: 4 }, { id: 2, name: 'Second', min: 10 }];

  it('finds the next unreached tier', () => {
    expect(getNextTierForMetric(2, ladder).name).toBe('First');
    expect(getNextTierForMetric(5, ladder).name).toBe('Second');
    expect(getNextTierForMetric(10, ladder)).toBeNull();
  });

  it('never reports a negative amount still needed', () => {
    expect(amountToReachTier(2, { min: 4 })).toBe(2);
    expect(amountToReachTier(10, { min: 4 })).toBe(0);
    expect(amountToReachTier(5, null)).toBe(0);
  });
});
