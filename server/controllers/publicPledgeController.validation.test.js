import { describe, expect, it } from 'vitest';
import { parsePublicPledge } from './publicPledgeController.js';

describe('parsePublicPledge', () => {
  it('requires a name and an item', () => {
    expect(parsePublicPledge({ pledgedItem: 'Goat' }).error).toBe('Please add your name');
    expect(parsePublicPledge({ pledgerName: 'Sipho' }).error).toBe('Please say what you will bring');
    expect(parsePublicPledge({ pledgerName: '   ', pledgedItem: 'Goat' }).error).toBe('Please add your name');
  });

  it('trims and caps text so a forwarded link cannot store huge values', () => {
    const { value } = parsePublicPledge({ pledgerName: '  Uncle   Sipho ', pledgedItem: 'x'.repeat(500), relationship: '' });
    expect(value.pledgerName).toBe('Uncle Sipho');
    expect(value.pledgedItem).toHaveLength(120);
    expect(value.relationship).toBeNull();
  });

  it('keeps the amount optional and rejects bad or negative amounts', () => {
    expect(parsePublicPledge({ pledgerName: 'A', pledgedItem: 'B', pledgedAmountZAR: '' }).value.pledgedAmountZAR).toBeNull();
    expect(parsePublicPledge({ pledgerName: 'A', pledgedItem: 'B', pledgedAmountZAR: '499.999' }).value.pledgedAmountZAR).toBe(500);
    expect(parsePublicPledge({ pledgerName: 'A', pledgedItem: 'B', pledgedAmountZAR: '-5' }).error).toBeTruthy();
    expect(parsePublicPledge({ pledgerName: 'A', pledgedItem: 'B', pledgedAmountZAR: 'abc' }).error).toBeTruthy();
    expect(parsePublicPledge({ pledgerName: 'A', pledgedItem: 'B', pledgedAmountZAR: 5_000_000 }).error).toBeTruthy();
  });
});
