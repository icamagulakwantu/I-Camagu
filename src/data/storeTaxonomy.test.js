import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, departmentOf, aisleOf } from './storeTaxonomy.js';

describe('SmartMatch store taxonomy', () => {
  it('keeps alcohol separate from soft drinks and water', () => {
    expect(departmentOf({ category: 'BEER' }).id).toBe('alcohol');
    expect(departmentOf({ category: 'SOFT_DRINKS' }).id).toBe('softdrinks');
    expect(departmentOf({ category: 'WATER' }).id).toBe('softdrinks');
    expect(departmentOf({ category: 'MIXER' }).id).toBe('softdrinks');
    expect(aisleOf({ category: 'MIXER' }).id).toBe('mixers');
    // Extreme Energy is an alcoholic beverage and must stay in Alcohol.
    expect(departmentOf({ category: 'CIDER_RTD', name: 'Extreme Energy' }).id).toBe('alcohol');
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

  it('maps every category code in the current catalogue export', () => {
    const catalogueCategories = [
      'BEER', 'BRANDY', 'CANNED_GOODS', 'CHAMPAGNE', 'CIDER_RTD', 'COGNAC',
      'DRY_GOODS', 'FRESH_PRODUCE', 'GIN', 'GROCERY', 'GROCERY_BULK',
      'LIQUEUR', 'LIVESTOCK_ANIMAL', 'MEAT', 'MIXER', 'RITUAL_SUPPLIES',
      'SOFT_DRINKS', 'SPARKLING', 'TEQUILA', 'TEQUILA_PREMIUM',
      'ULWALUKO_SUPPLIES', 'VODKA', 'VODKA_PREMIUM', 'WATER', 'WHISKY',
      'WINE', 'WINE_BOX',
    ];
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
