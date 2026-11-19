import { describe, expect, it } from 'vitest'
import { animalsFor, feastFor } from './feast.js'

describe('feast calculator', () => {
  it('covers the meat with sheep when no beast is chosen', () => {
    expect(animalsFor(200)).toEqual({ meatKg: 64, beasts: 0, sheep: 4 })
  })
  it('a beast covers most of a large feast, sheep the rest', () => {
    expect(animalsFor(700, 1)).toEqual({ meatKg: 224, beasts: 1, sheep: 2 })
    expect(animalsFor(300, 1).sheep).toBe(0)
  })
  it('returns nothing for no guests', () => {
    const feast = feastFor(0)
    expect(feast.lines).toEqual([])
    expect(feast.total).toBe(0)
  })
  it('scales the shopping list and totals it', () => {
    const feast = feastFor(150)
    const qty = Object.fromEntries(feast.lines.map((l) => [l.key, l.qty]))
    expect(qty).toMatchObject({ sheep: 3, maize: 1, rice: 2, cabbage: 9, spinach: 10, plates: 3 })
    expect(feast.lines.find((l) => l.key === 'beast')).toBeUndefined()
    expect(feast.total).toBeGreaterThan(8000)
    expect(feast.perGuest).toBe(Math.round(feast.total / 150))
  })
  it('ignores bad input', () => {
    expect(animalsFor('abc', -2)).toEqual({ meatKg: 0, beasts: 0, sheep: 0 })
  })
})
