import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({ default: {} }));
vi.mock('./matchmakerService.js', () => ({
  checkAndMatchPool: vi.fn(),
  parkItemsIntoPool: vi.fn(),
}));

import { buildCrossPoolAggregationSuggestions } from './poolDiscoveryService.js';

describe('buildCrossPoolAggregationSuggestions', () => {
  it('combines different products in compatible-area pools and flags a three-pallet-equivalent target as indicative', () => {
    const suggestions = buildCrossPoolAggregationSuggestions([
      { id: 'p1', status: 'OPEN', area: 'East London', partnerName: 'Supplier A', category: 'TAVERN', currentAmountZAR: 8000 },
      { id: 'p2', status: 'OPEN', area: 'East London', partnerName: 'Supplier A', category: 'GROCERY', currentAmountZAR: 8000 },
      { id: 'p3', status: 'OPEN', area: 'East London', partnerName: 'Supplier A', category: 'TAVERN', currentAmountZAR: 8000 },
    ], 100);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].poolCount).toBe(3);
    expect(suggestions[0].distinctCategories).toEqual(['TAVERN', 'GROCERY']);
    expect(suggestions[0].combinedOrderValueZAR).toBe(24000);
    expect(suggestions[0].indicativePalletEquivalent).toBeCloseTo(4.29, 2);
    expect(suggestions[0].reachesThreePalletEquivalent).toBe(true);
    expect(suggestions[0].supplierConfirmationRequired).toBe(true);
    expect(suggestions[0].orderPlaced).toBe(false);
    expect(suggestions[0].potentialDiscountLabel).toContain('Research-backed 8–10% bulk-discount target');
  });

  it('does not combine different named suppliers or different areas', () => {
    const suggestions = buildCrossPoolAggregationSuggestions([
      { id: 'p1', status: 'OPEN', area: 'East London', partnerName: 'Supplier A', currentAmountZAR: 8000 },
      { id: 'p2', status: 'OPEN', area: 'East London', partnerName: 'Supplier B', currentAmountZAR: 8000 },
      { id: 'p3', status: 'OPEN', area: 'Gqeberha', partnerName: 'Supplier A', currentAmountZAR: 8000 },
    ], 100);
    expect(suggestions).toEqual([]);
  });

  it('does not invent pallet equivalence when the reference case price is missing or invalid', () => {
    expect(buildCrossPoolAggregationSuggestions([], null)).toEqual([]);
    expect(buildCrossPoolAggregationSuggestions([], 0)).toEqual([]);
  });
});
