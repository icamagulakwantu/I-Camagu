import { describe, expect, it } from 'vitest';
import { parsePositiveIntegerQuantity } from './quantity.js';

describe('parsePositiveIntegerQuantity', () => {
  it.each([[1, 1], ['56', 56], [' 003 ', 3]])('accepts a valid integer quantity %s', (input, expected) => {
    expect(parsePositiveIntegerQuantity(input)).toBe(expected);
  });

  it.each(['2.5', '2abc', '', '0', '-1', 'Infinity', '1e3', Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid quantity %s',
    (input) => {
      expect(() => parsePositiveIntegerQuantity(input)).toThrow('Quantity must be a whole number of at least 1');
    }
  );
});
