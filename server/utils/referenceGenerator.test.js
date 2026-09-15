import { describe, it, expect, vi } from 'vitest';
import { generateUniqueReference } from './referenceGenerator.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

describe('generateUniqueReference', () => {
  it('produces PREFIX-XXXXXX using only the non-ambiguous alphabet', async () => {
    const exists = vi.fn().mockResolvedValue(false);
    const code = await generateUniqueReference('ORD', exists);

    expect(code).toMatch(/^ORD-[A-Z0-9]{6}$/);
    const suffix = code.split('-')[1];
    for (const char of suffix) expect(ALPHABET).toContain(char);
    // Visually ambiguous characters must never appear, even though they're
    // valid A-Z0-9 — this is the whole point of the restricted alphabet.
    expect(suffix).not.toMatch(/[01IOL]/);
  });

  it('retries on an actual collision instead of returning a taken code', async () => {
    const exists = vi.fn()
      .mockResolvedValueOnce(true)  // first candidate is taken
      .mockResolvedValueOnce(false); // second candidate is free

    const code = await generateUniqueReference('PAY', exists);

    expect(exists).toHaveBeenCalledTimes(2);
    expect(code).toMatch(/^PAY-[A-Z0-9]{6}$/);
  });

  it('gives up after maxAttempts and throws rather than returning a colliding code', async () => {
    const exists = vi.fn().mockResolvedValue(true); // always taken

    await expect(
      generateUniqueReference('GRP', exists, { maxAttempts: 3 })
    ).rejects.toThrow(/Could not generate a unique GRP reference after 3 attempts/);
    expect(exists).toHaveBeenCalledTimes(3);
  });

  it('never repeats the same prefix logic across different reference types', async () => {
    const exists = vi.fn().mockResolvedValue(false);
    const [order, payment, group] = await Promise.all([
      generateUniqueReference('ORD', exists),
      generateUniqueReference('PAY', exists),
      generateUniqueReference('GRP', exists),
    ]);

    expect(order.startsWith('ORD-')).toBe(true);
    expect(payment.startsWith('PAY-')).toBe(true);
    expect(group.startsWith('GRP-')).toBe(true);
  });
});
