import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/db.js', () => ({ default: {} }));
vi.mock('../services/ledgerService.js', () => ({}));
vi.mock('../services/pinService.js', () => ({}));

const { suggestedContributionCents } = await import('./payoutController.js');

// The voluntary 3% fund contribution used to be worked out with floating
// point (amount * 0.03), which can produce fractions of a cent.
describe('suggestedContributionCents', () => {
  it('is exactly 3% for round amounts', () => {
    expect(suggestedContributionCents(100000)).toBe(3000); // R1000 -> R30
  });

  it('rounds half-up to a whole cent', () => {
    expect(suggestedContributionCents(1050)).toBe(32); // R10.50 * 3% = 31.5c -> 32c
    expect(suggestedContributionCents(1049)).toBe(31); // 31.47c -> 31c
  });

  it('always returns whole cents', () => {
    for (const cents of [1, 99, 12345, 3333333]) {
      expect(Number.isInteger(suggestedContributionCents(cents))).toBe(true);
    }
  });
});
