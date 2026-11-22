import { describe, expect, it } from 'vitest';
import { pushPathFor, pushPayload } from './pushService.js';

describe('phone notification payload', () => {
  it('opens the notification screen, or the screen the notification points at', () => {
    expect(pushPathFor('stokvels')).toBe('/stokvels');
    expect(pushPathFor(null)).toBe('/me/notifications');
    expect(pushPathFor('no-such-screen')).toBe('/me/notifications');
  });
  it('carries the message, trimmed, under the i-Camagu name', () => {
    const p = JSON.parse(pushPayload({ id: 'n1', message: 'x'.repeat(500), linkScreen: 'store' }));
    expect(p).toMatchObject({ title: 'i-Camagu', url: '/smartmatch', tag: 'n1' });
    expect(p.body).toHaveLength(240);
  });
});
