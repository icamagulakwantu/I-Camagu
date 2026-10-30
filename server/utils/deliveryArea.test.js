import { describe, expect, it } from 'vitest';
import { guessAreaFromAddress, isPrivateOrderPool, poolIsNear, resolveDelivery } from './deliveryArea.js';

describe('guessAreaFromAddress', () => {
  it('skips the street line and returns the suburb', () => {
    expect(guessAreaFromAddress('12 Ncedo St, Motherwell, Gqeberha')).toBe('Motherwell');
  });
  it('handles a plain suburb', () => {
    expect(guessAreaFromAddress('Motherwell')).toBe('Motherwell');
  });
  it('strips a house number when only a street was typed', () => {
    expect(guessAreaFromAddress('45 Main Road')).toBe('Main Road');
  });
});

describe('resolveDelivery', () => {
  const joburgUser = { address: '5 Vilakazi St, Soweto', location: 'Soweto', latitude: -26.24, longitude: 27.9 };

  it('never borrows profile coordinates for a typed address', () => {
    const delivery = resolveDelivery(joburgUser, { address: '12 Ncedo St, Motherwell' });
    expect(delivery).toEqual({ address: '12 Ncedo St, Motherwell', area: 'Motherwell', latitude: null, longitude: null });
  });
  it('treats null coordinates as no location', () => {
    const delivery = resolveDelivery(joburgUser, { address: 'Motherwell', latitude: null, longitude: null });
    expect(delivery.latitude).toBe(null);
  });
  it('uses map coordinates and area from the lookup when given', () => {
    const delivery = resolveDelivery(joburgUser, { address: 'Motherwell, Gqeberha', area: 'Motherwell', latitude: -33.8, longitude: 25.6 });
    expect(delivery.latitude).toBe(-33.8);
    expect(delivery.area).toBe('Motherwell');
  });
  it('falls back to the profile when nothing was typed', () => {
    expect(resolveDelivery(joburgUser, null).area).toBe('Soweto');
  });
  it('returns an empty area when there is nothing to go on', () => {
    expect(resolveDelivery({}, null).area).toBe('');
  });
});

describe('poolIsNear', () => {
  const pePool = { area: 'Motherwell', latitude: -33.8, longitude: 25.6, radiusKm: 20 };
  it('matches a pool within its radius', () => {
    expect(poolIsNear(pePool, { latitude: -33.85, longitude: 25.6 }, 'Motherwell')).toBe(true);
  });
  it('rejects a far-away pool even with the same area name', () => {
    expect(poolIsNear(pePool, { latitude: -26.2, longitude: 28.0 }, 'Motherwell')).toBe(false);
  });
  it('falls back to the area name without coordinates', () => {
    expect(poolIsNear({ area: 'motherwell ' }, null, 'Motherwell')).toBe(true);
  });
});

describe('isPrivateOrderPool', () => {
  it('flags zero-radius pools only', () => {
    expect(isPrivateOrderPool({ radiusKm: 0 })).toBe(true);
    expect(isPrivateOrderPool({ radiusKm: 20 })).toBe(false);
  });
});
