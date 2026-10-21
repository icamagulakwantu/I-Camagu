import { describe, it, expect } from 'vitest';
import { summariseCosts, suggestedTotal, TRANSPORT_SUGGESTED_CAP } from './ceremonyCosts.js';

describe('suggestedTotal', () => {
  it('multiplies quantity by unit price', () => {
    expect(suggestedTotal({ category: 'food', quantity: 3, unitCost: 145 })).toBe(435);
  });

  it('never suggests more than the transport ceiling', () => {
    expect(suggestedTotal({ category: 'transport', quantity: 1, unitCost: 1200 })).toBe(TRANSPORT_SUGGESTED_CAP);
    expect(suggestedTotal({ category: 'transport', quantity: 1, unitCost: 200 })).toBe(200);
  });

  it('leaves other categories uncapped', () => {
    expect(suggestedTotal({ category: 'livestock', quantity: 1, unitCost: 18000 })).toBe(18000);
  });
});

describe('summariseCosts', () => {
  const costItems = [
    { category: 'transport', quantity: 1, unitCost: 1200, actualCostZAR: null, isPurchased: false },
    { category: 'food', quantity: 2, unitCost: 500, actualCostZAR: null, isPurchased: false },
  ];

  it('deducts nothing from the budget until a real price is entered', () => {
    const s = summariseCosts({ budgetZAR: 10000, costItems });
    expect(s.spent).toBe(0);
    expect(s.remaining).toBe(10000);
    expect(s.projected).toBe(1350);
  });

  it('deducts the actual price, not the suggested one', () => {
    const paid = [{ ...costItems[0], actualCostZAR: 200 }, costItems[1]];
    const s = summariseCosts({ budgetZAR: 10000, costItems: paid });
    expect(s.spent).toBe(200);
    expect(s.remaining).toBe(9800);
    expect(s.projected).toBe(1200);
  });

  it('counts amounts entered on the checklist against the same budget', () => {
    const s = summariseCosts({
      budgetZAR: 10000,
      costItems,
      checklistItems: [{ phase: 'FOOD', actualCostZAR: 9700 }],
    });
    expect(s.spent).toBe(9700);
    expect(s.remaining).toBe(300);
  });

  it('adds unforeseen expenses to spent, the projection and the unforeseen total', () => {
    const s = summariseCosts({
      budgetZAR: 1000,
      costItems: [],
      checklistItems: [{ phase: 'UNFORESEEN', label: 'Extra ice', actualCostZAR: 150 }],
    });
    expect(s.unforeseen).toBe(150);
    expect(s.spent).toBe(150);
    expect(s.projected).toBe(150);
  });

  it('flags when real spending passes the budget', () => {
    const s = summariseCosts({ budgetZAR: 500, checklistItems: [{ phase: 'FOOD', actualCostZAR: 650 }] });
    expect(s.overBudget).toBe(true);
    expect(s.remaining).toBe(-150);
  });

  it('copes with no budget set', () => {
    const s = summariseCosts({ budgetZAR: null, costItems });
    expect(s.remaining).toBeNull();
    expect(s.overBudget).toBe(false);
  });

  it('adds rough estimates on unpaid tasks to the projection only', () => {
    const s = summariseCosts({ budgetZAR: 1000, checklistItems: [{ phase: 'FOOD', targetCostZAR: 80, actualCostZAR: null }] });
    expect(s.spent).toBe(0);
    expect(s.projected).toBe(80);
  });
});
