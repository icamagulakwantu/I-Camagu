import { describe, expect, it } from 'vitest';
import { publicPractitioner } from './directoryController.js';

describe('publicPractitioner', () => {
  const base = { id: 'p1', name: 'A', area: 'Mthatha', contactInfo: '0821234567' };

  it('withholds an unverified ingcibi\'s contact details', () => {
    const out = publicPractitioner({ ...base, role: 'INGCIBI', isVerified: false });
    expect(out.contactInfo).toBeNull();
    expect(out.contactWithheld).toBe(true);
  });

  it('shows a verified ingcibi\'s contact details', () => {
    expect(publicPractitioner({ ...base, role: 'INGCIBI', isVerified: true }).contactInfo).toBe('0821234567');
  });

  it('leaves other roles as they are', () => {
    expect(publicPractitioner({ ...base, role: 'CULTURAL_ADVISOR', isVerified: false }).contactInfo).toBe('0821234567');
  });
});
