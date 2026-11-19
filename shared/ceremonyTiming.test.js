import { describe, expect, it } from 'vitest'
import { dueDateFor, comingUp, timingFor, describeDue } from './ceremonyTiming.js'

const ulwaluko = { type: 'ULWALUKO', eventDate: '2026-11-20T00:00:00', homecomingDate: '2026-12-18T00:00:00' }
const iso = (d) => d.toISOString().slice(0, 10)

describe('ceremony timing', () => {
  it('needs registration three months before going in', () => {
    expect(iso(dueDateFor('REGISTRATION', ulwaluko))).toBe(iso(new Date('2026-08-22T00:00:00')))
  })

  it('counts umgidi stages from the umgidi date', () => {
    expect(iso(dueDateFor('IBHOMA_CLOSURE', ulwaluko))).toBe(iso(new Date('2026-12-17T00:00:00')))
  })

  it('assumes umgidi four weeks after going in when no umgidi date is set', () => {
    expect(iso(dueDateFor('IBHOMA_CLOSURE', { ...ulwaluko, homecomingDate: null }))).toBe(iso(new Date('2026-12-17T00:00:00')))
  })

  it('reads ancestral-rite stages by kind', () => {
    expect(timingFor('PLANNING_LINEAGE').days).toBe(-30)
    expect(timingFor('RITUAL_SLAUGHTER').days).toBe(0)
  })

  it('lists what is due soon (tasks and things to buy), undone only, soonest first', () => {
    const rows = [
      { kind: 'task', phase: 'IBHOMA_CONSTRUCTION', label: 'Tools', done: false },
      { kind: 'task', phase: 'PHYSICAL_PREPARATION', label: 'Hair', done: true },
      { kind: 'task', phase: 'UMOJISO', label: 'Sybok', done: false },
      { kind: 'cost', phase: 'IBHOMA_CONSTRUCTION', label: 'Sail', done: false },
    ]
    const list = comingUp(rows, ulwaluko, { now: new Date('2026-11-19T10:00:00') })
    expect(list.map((e) => e.row.label)).toEqual(['Tools', 'Sail', 'Sybok'])
    expect(list[0].daysLeft).toBe(-1)
  })
  it('says long-overdue items gently', () => {
    expect(describeDue(-89)).toBe('Should already be done')
    expect(describeDue(-1)).toBe('Overdue by a day')
    expect(describeDue(0)).toBe('Today')
  })
})
