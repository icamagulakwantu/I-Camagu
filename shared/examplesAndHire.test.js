import { describe, expect, it } from 'vitest'
import { hirePlan, hireCostLine } from './hire.js'
import { drinksPoolExample, groceryStokvelExample, societyExample, lendingCap, memberYear } from './examples.js'
import { exampleMembers } from './clanExample.js'
import { PHASE_SEQUENCES } from './ceremonyPhases.js'

describe('what to hire', () => {
  it('sizes the tents to the guests: 100-seat bundles, a 50-seat one for the rest', () => {
    expect(hirePlan(40).items[0]).toMatchObject({ low: 1800, high: 3200, tents: 1 })
    expect(hirePlan(100).items[0]).toMatchObject({ low: 3500, high: 6000, tents: 1 })
    expect(hirePlan(150).items[0]).toMatchObject({ low: 5300, high: 9200, tents: 2 })
  })
  it('scales stoves, urns and crockery with the guests', () => {
    const p = hirePlan(150)
    expect(p.items.find((i) => i.id === 'gas_stove').qty).toBe(2)
    expect(p.items.find((i) => i.id === 'urn').qty).toBe(1)
    expect(p.items.find((i) => i.id === 'crockery').qty).toBe(150)
  })
  it('every item names who hires it out, and the usual items exclude the optional', () => {
    const p = hirePlan(150)
    expect(p.items.every((i) => i.vendor?.name && i.vendor?.contact)).toBe(true)
    expect(p.usualLow).toBe(p.items.filter((i) => !i.optional).reduce((s, i) => s + i.low, 0))
  })
  it('a chosen item becomes a guide-priced line in its own Hire stage', () => {
    const line = hireCostLine('mobile_fridge', 150)
    expect(line).toMatchObject({ phase: 'HIRE', label: 'Hire: Mobile fridge', unitCost: 925, quantity: 1 })
    expect(hireCostLine('not-an-item', 150)).toBeNull()
  })
  it('the Hire stage sits with the preparations, before the day', () => {
    const u = PHASE_SEQUENCES.ULWALUKO
    expect(u.indexOf('HIRE')).toBeGreaterThan(u.indexOf('RETURN_HOME'))
    expect(u.indexOf('HIRE')).toBeLessThan(u.indexOf('ARRIVAL_INGQONGQO'))
  })
})

describe('worked examples (founder’s rules)', () => {
  it('lending: what you put in, less the R100 retainer', () => {
    expect(lendingCap(350, 11)).toBe(3750)
    expect(lendingCap(50, 1)).toBe(0)
  })
  it('a member short of the interest target pays the difference', () => {
    expect(memberYear({ monthly: 350, months: 11, interestRaised: 700, target: 1000 })).toMatchObject({ contributed: 3850, shortfall: 300, toGroup: 4850 })
    expect(memberYear({ monthly: 350, months: 11, interestRaised: 1300, target: 1000 }).shortfall).toBe(0)
  })
  it('umgidi drinks: 50 members, R15,000 each, the standard basket, the gap closed by interest', () => {
    const d = drinksPoolExample()
    expect(d.savedPerMember).toBe(15000)
    expect(d.pool.map((p) => p.cases)).toEqual([150, 150, 500, 500])
    expect(d.gapWithoutInterest).toBeGreaterThan(0)
    expect(d.leftoverPerMember).toBeGreaterThanOrEqual(0)
  })
  it('grocery stokvel: R350 a month Jan to Nov, groceries bought, the rest for uniform and stationery', () => {
    const g = groceryStokvelExample()
    expect(g.contributed).toBe(3850)
    expect(g.fridgeMonthly + g.dryMonthly).toBe(350)
    expect(g.fridgeTotal).toBeLessThanOrEqual(g.fridgeMonthly * g.months + g.target)
    expect(g.leftover).toBeGreaterThan(0)
    expect(g.members).toBeGreaterThanOrEqual(15)
  })
  it('society: from R100 a month, each takes home their own money and their own interest', () => {
    const s = societyExample()
    expect(s.members.every((m) => m.monthly >= 100 && m.payout === m.contributed + m.interest)).toBe(true)
  })
})

describe('clan member counts', () => {
  it('are steady and in a sensible range', () => {
    expect(exampleMembers('AmaTshawe')).toBe(exampleMembers('AmaTshawe'))
    for (const name of ['AmaTshawe', 'AmaZangwa', 'AmaCete', 'Cwerha']) {
      expect(exampleMembers(name)).toBeGreaterThanOrEqual(40)
      expect(exampleMembers(name)).toBeLessThanOrEqual(400)
    }
  })
})
