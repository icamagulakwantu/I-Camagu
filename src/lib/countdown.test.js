import { describe, expect, it } from 'vitest'
import { daysUntil, describeCountdown, nextCeremony } from './countdown.js'

const NOW = new Date('2026-11-12T10:00:00')

describe('describeCountdown', () => {
  it('reads naturally at every distance', () => {
    expect(describeCountdown(0)).toBe('today')
    expect(describeCountdown(1)).toBe('tomorrow')
    expect(describeCountdown(2)).toBe('in 2 days')
    expect(describeCountdown(20)).toBe('in 3 weeks')
    expect(describeCountdown(412)).toBe('in 14 months')
    expect(describeCountdown(900)).toBe('in 2 years')
    expect(describeCountdown(null)).toBe('')
  })
})

describe('nextCeremony', () => {
  it('features the soonest upcoming ceremony, not the first in the list', () => {
    const umgidi = { id: 'umgidi', eventDate: '2027-12-29' }
    const wedding = { id: 'wedding', eventDate: '2026-11-14' }
    const past = { id: 'past', eventDate: '2026-01-01' }
    expect(nextCeremony([umgidi, past, wedding], NOW).id).toBe('wedding')
    expect(daysUntil(wedding.eventDate, NOW)).toBe(2)
  })

  it('falls back to an undated ceremony, then the first one', () => {
    expect(nextCeremony([{ id: 'past', eventDate: '2026-01-01' }, { id: 'undated' }], NOW).id).toBe('undated')
    expect(nextCeremony([{ id: 'past', eventDate: '2026-01-01' }], NOW).id).toBe('past')
    expect(nextCeremony([], NOW)).toBeNull()
  })
})
