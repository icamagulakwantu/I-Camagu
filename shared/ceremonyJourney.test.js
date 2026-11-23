import { describe, expect, it } from 'vitest'
import { groupRowsByPhase } from './ceremonyList.js'
import { PHASE_SEQUENCES } from './ceremonyPhases.js'
import { fixedPlace, seatingGroupsFor, suggestedPlace } from './seating.js'
import CEREMONY_COST_PROFILES, { getDefaultItemsForType } from '../server/controllers/ceremonyCostProfiles.js'

const rowsFor = (phases) => phases.map((phase, i) => ({ key: `r${i}`, kind: 'task', phase, label: phase }))
const order = (phases) => groupRowsByPhase(rowsFor(phases)).map((g) => g.phase)

describe('a plan reads in the order of the journey (founder, 23 Nov 2026)', () => {
  it('ulwaluko: home, the mountain, coming out, then umgidi, then ubukrwala, whatever the due dates', () => {
    const journey = PHASE_SEQUENCES.ULWALUKO
    const shuffled = [...journey].reverse()
    expect(order(shuffled)).toEqual(journey)
    // Umgidi's preparation falls due weeks ahead, yet it never appears among the mountain stages.
    expect(journey.indexOf('VIP_EKOYINI')).toBeGreaterThan(journey.indexOf('RETURN_HOME'))
    expect(journey.indexOf('HIERARCHY_ALLOCATION')).toBeGreaterThan(journey.indexOf('RETURN_HOME'))
    expect(journey.at(-1)).toBe('UBUKRWALA')
  })

  it('his hair is cut before the ibhoma is built, and the ibhoma before he goes in', () => {
    const journey = PHASE_SEQUENCES.ULWALUKO
    expect(journey.indexOf('PHYSICAL_PREPARATION')).toBeLessThan(journey.indexOf('IBHOMA_CONSTRUCTION'))
    expect(journey.indexOf('IBHOMA_CONSTRUCTION')).toBeLessThan(journey.indexOf('TRANSPORT_ARRIVAL'))
    const labels = getDefaultItemsForType('ULWALUKO').map((i) => i.label)
    expect(labels.indexOf('Head, facial, and pubic hair fully removed')).toBeLessThan(labels.findIndex((l) => l.startsWith('Ipeki and shovel')))
  })

  it('umgidi day: getting ready, then he arrives, everyone in their place, ukuyala, closing', () => {
    const umgidi = PHASE_SEQUENCES.UMGIDI
    expect(umgidi.indexOf('COOKING_KITCHEN')).toBeLessThan(umgidi.indexOf('ARRIVAL_INGQONGQO'))
    expect(umgidi.indexOf('ARRIVAL_INGQONGQO')).toBeLessThan(umgidi.indexOf('KRAAL_SEATING'))
    expect(umgidi.indexOf('KRAAL_SEATING')).toBeLessThan(umgidi.indexOf('ELDER_GUIDANCE'))
    expect(umgidi.at(-1)).toBe('CLOSURE')
  })

  it('keeps every ceremony in its own order, though some share a stage name', () => {
    for (const [type, sequence] of Object.entries(PHASE_SEQUENCES)) {
      expect(order([...sequence].reverse()), type).toEqual(sequence)
    }
  })

  it('the ancestors are addressed before the slaughter', () => {
    expect(PHASE_SEQUENCES.UKUKHAPHA.indexOf('ANCESTRAL_ADDRESS')).toBeLessThan(PHASE_SEQUENCES.UKUKHAPHA.indexOf('RITUAL_SLAUGHTER'))
    const buyisa = getDefaultItemsForType('UKUBUYISA').map((i) => i.label)
    expect(buyisa.findIndex((l) => l.includes('Ukunqula calling'))).toBeLessThan(buyisa.indexOf('Perform Ukuxhela on the male ox at dawn'))
  })
})

describe('sensitive wording', () => {
  const everyLabel = () => [
    ...['ULWALUKO', 'UMGIDI', 'INTAMBO_ENKULU', 'UKUKHAPHA', 'INKOBE', 'UKUBUYISA', 'UMSEBENZI_WEGQIRHA', 'IMBELEKO', 'INTONJANE', 'WEDDING']
      .flatMap((type) => getDefaultItemsForType(type).map((i) => i.label)),
    ...Object.values(CEREMONY_COST_PROFILES).flatMap((profile) => Object.values(profile).flat().map((i) => i.label)),
  ]

  it('no checklist or price line mentions a wound, drying or a throat', () => {
    for (const label of everyLabel()) expect(label, label).not.toMatch(/wound|dries|drying|throat/i)
  })

  it('ulwaluko and umgidi never mention healing (the igqirha’s healing calling is another matter)', () => {
    const labels = [...getDefaultItemsForType('ULWALUKO'), ...Object.values(CEREMONY_COST_PROFILES.ULWALUKO).flat()].map((i) => i.label)
    for (const label of labels) expect(label, label).not.toMatch(/\bheal(s|ing|ed)?\b/i)
  })

  it('ukukhapha has no umqombothi: it is not a celebration', () => {
    const labels = [...getDefaultItemsForType('UKUKHAPHA'), ...Object.values(CEREMONY_COST_PROFILES.UKUKHAPHA).flat()].map((i) => i.label)
    expect(labels.filter((l) => /^Brew Umqombothi/.test(l))).toEqual([])
  })

  it('brewing is made ready before the day, not at the closing', () => {
    for (const type of ['INTAMBO_ENKULU', 'INKOBE']) {
      const brew = getDefaultItemsForType(type).find((i) => i.label.startsWith('Brew Umqombothi'))
      expect(brew.phase, type).not.toBe('CLOSURE')
    }
  })
})

describe('seating by groups', () => {
  it('umgidi: the fourteen groups in order of seniority, each with a place', () => {
    const groups = seatingGroupsFor('ULWALUKO')
    expect(groups).toHaveLength(14)
    expect(groups[0]).toEqual({ groupLabel: 'Ootata', place: expect.stringMatching(/Ebuhlanti/) })
    expect(groups.find((g) => g.groupLabel === 'OoMama').place).toMatch(/Endlini enkulu/)
    expect(groups.every((g) => g.place)).toBe(true)
  })

  it('indlu yesibane, for initiated men, belongs to umgidi only', () => {
    expect(seatingGroupsFor('UKUBUYISA').map((g) => g.groupLabel)).not.toContain('Indlu yeSbane')
    expect(seatingGroupsFor('UMGIDI').map((g) => g.groupLabel)).toContain('Indlu yeSbane')
  })

  it('every isiko ceremony has a seating step', () => {
    for (const type of ['ULWALUKO', 'UMGIDI', 'INTAMBO_ENKULU', 'UKUKHAPHA', 'INKOBE', 'UKUBUYISA', 'IMBELEKO']) {
      expect(getDefaultItemsForType(type).some((i) => /^Seat/.test(i.label)), type).toBe(true)
    }
    expect(suggestedPlace('A group the family added')).toBeNull()
  })
})

describe('seating: ootata always ebuhlanti', () => {
  it('fixes ootata’s place, whatever the spelling, and nothing else', () => {
    expect(fixedPlace('Ootata')).toMatch(/^Ebuhlanti/)
    expect(fixedPlace(' OoTata ')).toMatch(/^Ebuhlanti/)
    expect(fixedPlace('OoMama')).toBeNull()
    expect(seatingGroupsFor('UMGIDI')[0]).toMatchObject({ groupLabel: 'Ootata', place: fixedPlace('Ootata') })
  })
})
