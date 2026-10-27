import { describe, expect, it } from 'vitest';
import { createShareToken, isShareTokenValid, SHARE_LINK_TTL_MS } from './shareToken.js';

describe('ceremony share tokens', () => {
  it('creates a token that is valid for its creation time', () => {
    const token = createShareToken(1_800_000_000_000, 'a'.repeat(32));
    expect(isShareTokenValid(token, 1_800_000_000_000)).toBe(true);
  });

  it('expires after 30 days', () => {
    const createdAt = 1_800_000_000_000;
    const token = createShareToken(createdAt, 'b'.repeat(32));
    expect(isShareTokenValid(token, createdAt + SHARE_LINK_TTL_MS)).toBe(true);
    expect(isShareTokenValid(token, createdAt + SHARE_LINK_TTL_MS + 1)).toBe(false);
  });

  it('rejects malformed, legacy and future-dated tokens', () => {
    expect(isShareTokenValid('oldrandomtoken')).toBe(false);
    expect(isShareTokenValid('not-a-valid-token')).toBe(false);
    expect(isShareTokenValid(createShareToken(Date.now() + 60_000, 'c'.repeat(32)))).toBe(false);
  });
});
