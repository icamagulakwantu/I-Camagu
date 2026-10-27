// Parse quantities submitted by APIs as exact positive whole numbers.
// parseInt is deliberately avoided because it silently turns "2.5" or "2abc"
// into 2, which changes what a member asked to order.
export function parsePositiveIntegerQuantity(value) {
  const raw = typeof value === 'number' ? String(value) : String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error('Quantity must be a whole number of at least 1');
  }
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 2_147_483_647) {
    throw new Error('Quantity must be a whole number of at least 1');
  }
  return amount;
}
