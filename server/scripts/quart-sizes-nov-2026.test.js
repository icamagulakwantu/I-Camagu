import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RELABELS } from './quart-sizes-nov-2026.js';

describe('quart size corrections', () => {
  it('never prices a case above its verified shop price, and photos exist', () => {
    for (const [, from, to, { bulk, retail, image, note }] of RELABELS) {
      expect(from).not.toBe(to);
      expect(note.length).toBeGreaterThan(10);
      if (bulk != null && retail != null) expect(bulk).toBeLessThanOrEqual(retail);
      if (image) expect(existsSync(new URL(`../../public${image}`, import.meta.url))).toBe(true);
    }
  });
});
