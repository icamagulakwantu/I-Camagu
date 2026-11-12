import { describe, expect, it } from 'vitest'
import { containersFor, grainKg, litresForGuests } from './umqombothi.js'

describe('litresForGuests', () => {
  it('brews a litre per guest by default, rounded up to the next 5 L', () => {
    expect(litresForGuests(250)).toBe(250)
    expect(litresForGuests(42)).toBe(45)
    expect(litresForGuests(3)).toBe(5)
  })
  it('follows the host’s litres per guest, within sensible limits', () => {
    expect(litresForGuests(250, 0.5)).toBe(125)
    expect(litresForGuests(100, 1.5)).toBe(150)
    expect(litresForGuests(100, 10)).toBe(300)
    expect(litresForGuests(100, 0.1)).toBe(50)
  })
  it('needs nothing for no guests', () => {
    expect(litresForGuests(0)).toBe(0)
    expect(litresForGuests(undefined)).toBe(0)
  })
})

describe('grainKg', () => {
  it('keeps the existing 0.1 kg of each grain per litre', () => {
    expect(grainKg(30)).toBe('3.0')
    expect(grainKg(250)).toBe('25.0')
    expect(grainKg(45)).toBe('4.5')
  })
})

describe('containersFor', () => {
  it('matches the four reference brews', () => {
    expect(containersFor(20).label).toBe('1 × 30 L container')
    expect(containersFor(30).label).toBe('1 × 50 L ifatyi')
    expect(containersFor(50).label).toBe('1 × 100 L ifatyi')
    expect(containersFor(100).label).toBe('1 × 200 L ifatyi')
  })
  it('splits a large brew across several 200 L ifatyi', () => {
    expect(containersFor(250)).toMatchObject({ count: 3, label: '3 × 200 L ifatyi' })
    expect(containersFor(101).count).toBe(2)
  })
})
