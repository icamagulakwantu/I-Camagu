import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRequiredEnvVars, envStatus } from './envCheck.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('environment diagnostics under the 2026 no-custody policy', () => {
  it('keeps PayFast presence visible for parity checks without warning that checkout is broken', () => {
    vi.stubEnv('DATABASE_URL', 'test-database-url');
    vi.stubEnv('JWT_ACCESS_SECRET', 'test-access-secret');
    vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret');
    vi.stubEnv('PAYFAST_MERCHANT_ID', '');
    vi.stubEnv('PAYFAST_MERCHANT_KEY', '');
    const warnings = [];
    vi.spyOn(console, 'warn').mockImplementation((...args) => warnings.push(args.join(' ')));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    checkRequiredEnvVars();

    expect(warnings.join('\n')).not.toContain('PAYFAST_MERCHANT_ID');
    expect(warnings.join('\n')).not.toContain('PAYFAST_MERCHANT_KEY');
    expect(envStatus()).toMatchObject({
      PAYFAST_MERCHANT_ID: false,
      PAYFAST_MERCHANT_KEY: false,
    });
  });
});
