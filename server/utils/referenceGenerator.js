// server/utils/referenceGenerator.js
// One place generating every system-issued reference code in the app — the
// code a member is told to put in an EFT reference, and the code that
// identifies a matched order. Two different people's or two different
// orders' codes colliding isn't just untidy: it's exactly the ambiguity a
// manual EFT reconciliation (or a supplier trying to tell which member's
// payment a bank transfer is for) depends on not having. Randomness alone
// only makes a collision unlikely — this checks the database and retries
// on an actual one, which is what "never the same" really requires.
import crypto from 'crypto';

// Excludes visually ambiguous characters (0/O, 1/I/L) since this is read
// aloud, typed into a banking app, or copied by hand into an EFT reference
// field.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomSuffix(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// `exists(candidate)` — an async check for whether this exact code is
// already taken, supplied by the caller since different reference types
// live in different tables/columns. Retries on an actual collision
// (astronomically unlikely at the default length — 32^6 ≈ 1 billion
// combinations — but checked, not just improbable).
export async function generateUniqueReference(prefix, exists, { suffixLength = 6, maxAttempts = 10 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `${prefix}-${randomSuffix(suffixLength)}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error(`Could not generate a unique ${prefix} reference after ${maxAttempts} attempts`);
}
