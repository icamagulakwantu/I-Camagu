import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHECKS_DIR, listCheckFiles, validateCheckFile } from './apply-price-checks.js';

const good = { checkedOn: '2026-11-30', checks: [{ name: 'Smirnoff 1818 Vodka', bottleFormat: '750ml Bottle', bulk: 1899, retail: 2159.88, source: 'takealot case of 12' }] };

describe('weekly price check files', () => {
  it('accepts a well-formed file', () => {
    expect(validateCheckFile(good)).toEqual([]);
  });
  it('refuses a bulk price above retail, a missing source and a bad date', () => {
    const bad = { checkedOn: '30 Nov', checks: [{ name: 'X', bottleFormat: 'Y', bulk: 300, retail: 200, source: '' }] };
    const problems = validateCheckFile(bad).join(' | ');
    expect(problems).toMatch(/checkedOn/);
    expect(problems).toMatch(/bulk above retail/);
    expect(problems).toMatch(/source/);
  });
  it('every committed check file is valid', () => {
    for (const f of listCheckFiles()) {
      expect(validateCheckFile(JSON.parse(readFileSync(new URL(f, CHECKS_DIR), 'utf8'))), f).toEqual([]);
    }
  });
});
