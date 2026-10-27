import { describe, expect, it } from 'vitest';
import { ORDER_STAGES, resolveOrderStage } from './orderStages.js';

describe('SmartMatch order stage labels', () => {
  it('labels FULFILLED as delivered or collected, not ready for delivery', () => {
    expect(ORDER_STAGES[4]).toBe('Delivered/collected');
    expect(resolveOrderStage('FULFILLED', { status: 'PENDING', hasReference: false })).toBe(4);
  });

  it('does not treat a submitted EFT reference as payment confirmation', () => {
    expect(resolveOrderStage('MATCHED', { status: 'PENDING', hasReference: true })).toBe(2);
  });

  it('shows payment confirmed only when the payment status is cleared', () => {
    expect(resolveOrderStage('MATCHED', { status: 'CLEARED', hasReference: true })).toBe(3);
  });
});
