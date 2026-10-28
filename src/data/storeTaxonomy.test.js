import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, departmentOf, aisleOf } from './storeTaxonomy.js';

describe('SmartMatch store taxonomy', () => {
  it('keeps alcohol separate from soft drinks and water', () => {
    expect(departmentOf({ category: 'RUM' }).id).toBe('alcohol');
    expect(aisleOf({ category: ' rum ' }).id).toBe('spirits');
    expect(departmentOf({ category: 'BEER' }).id).toBe('alcohol');
    expect(departmentOf({ category: 'SOFT_DRINKS' }).id).toBe('softdrinks');
    expect(departmentOf({ category: 'WATER' }).id).toBe('softdrinks');
    expect(departmentOf({ category: 'MIXER' }).id).toBe('softdrinks');
    expect(aisleOf({ category: 'MIXER' }).id).toBe('mixers');
    // Extreme Energy is an alcoholic beverage and must stay in Alcohol.
    expect(departmentOf({ category: 'CIDER_RTD', name: 'Extreme Energy' }).id).toBe('alcohol');
  });

  it('normalises category casing and whitespace before assigning a department', () => {
    expect(departmentOf({ category: ' water ' }).id).toBe('softdrinks');
    expect(aisleOf({ category: ' mixer ' }).id).toBe('mixers');
    expect(departmentOf({ category: ' beer ' }).id).toBe('alcohol');
    expect(departmentOf({ category: null }).id).toBe('other');
  });

  it('keeps meat separate from live livestock', () => {
    expect(departmentOf({ category: 'MEAT' }).id).toBe('meat');
    expect(departmentOf({ category: 'LIVESTOCK_ANIMAL' }).id).toBe('livestock');
  });

  it('keeps ceremony supplies separate from groceries', () => {
    expect(departmentOf({ category: 'DRY_GOODS' }).id).toBe('groceries');
    expect(departmentOf({ category: 'RITUAL_SUPPLIES' }).id).toBe('nonconsumables');
    expect(departmentOf({ category: 'ULWALUKO_SUPPLIES' }).id).toBe('nonconsumables');
  });

  it('routes unknown category codes to Other items instead of groceries', () => {
    expect(departmentOf({ category: 'NEW_UNREVIEWED_CODE' }).id).toBe('other');
    expect(aisleOf({ category: 'NEW_UNREVIEWED_CODE' }).id).toBe('review');
  });

  it('maps every category code in the committed catalogue export', () => {
    const tsv = readFileSync(new URL('../../docs/pricing/skus_clean.tsv', import.meta.url), 'utf8');
    const [header, ...rows] = tsv.trimEnd().split(/\r?\n/);
    const categoryIndex = header.split('\t').indexOf('category');
    expect(categoryIndex).toBeGreaterThanOrEqual(0);

    const catalogueCategories = [...new Set(
      rows
        .filter((row) => row.trim())
        .map((row) => row.split('\t')[categoryIndex]?.trim().toUpperCase())
        .filter(Boolean),
    )];

    expect(catalogueCategories.length).toBeGreaterThan(0);
    for (const category of catalogueCategories) {
      expect(departmentOf({ category }).id, category).not.toBe('other');
    }
  });

  it('exposes all top-level departments with unique IDs', () => {
    const ids = DEPARTMENTS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('other');
  });
});
