import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, departmentOf, aisleOf } from './storeTaxonomy.js';

describe('SmartMatch store taxonomy', () => {
  it('keeps alcohol separate from soft drinks and water', () => {
    expect(departmentOf({ category: 'BEER' }).id).toBe('alcohol');
    expect(departmentOf({ category: 'SOFT_DRINKS' }).id).toBe('softdrinks');
    expect(departmentOf({ category: 'WATER' }).id).toBe('softdrinks');
    // Known source-data error: energy drink SKUs were tagged CIDER_RTD.
    expect(departmentOf({ category: 'CIDER_RTD', name: 'Extreme Energy' }).id).toBe('softdrinks');
    expect(departmentOf({ category: 'CIDER_RTD', name: 'Extreme Energy' }).id).not.toBe('alcohol');
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

  it('exposes all top-level departments with unique IDs', () => {
    const ids = DEPARTMENTS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('other');
  });
});
