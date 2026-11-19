import { describe, expect, it } from 'vitest'
import { focusDate, nextCeremony } from './countdown.js'

const now = new Date('2026-11-20T09:00:00')

describe('focusDate', () => {
  it('counts down to going in before he has gone up', () => {
    expect(focusDate({ eventDate: '2026-11-20', homecomingDate: '2026-12-18' }, now)).toEqual({ date: '2026-11-20', isHomecoming: false })
  })

  it('moves to umgidi once he is on the mountain', () => {
    expect(focusDate({ eventDate: '2026-11-19', homecomingDate: '2026-12-18' }, now)).toEqual({ date: '2026-12-18', isHomecoming: true })
  })

  it('stays on the event date for ceremonies with one date', () => {
    expect(focusDate({ eventDate: '2026-11-01' }, now)).toEqual({ date: '2026-11-01', isHomecoming: false })
  })

  it('features an ulwaluko plan whose umgidi is still ahead', () => {
    const ulwaluko = { id: 'u', eventDate: '2026-11-19', homecomingDate: '2026-12-18' }
    const later = { id: 'w', eventDate: '2027-03-01' }
    expect(nextCeremony([later, ulwaluko], now).id).toBe('u')
  })
})
