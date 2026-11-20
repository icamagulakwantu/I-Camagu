import { describe, expect, it } from 'vitest'
import { ukugidaBookHtml, ukugidaCsv } from './ukugidaBook.js'

const entries = [
  { direction: 'RECEIVED', counterpartyName: 'Mam\' Nosipho, "Gogo"', itemDescription: 'Klipdrift 750ml', quantity: 2, unitType: 'bottle', eventDate: '2026-11-21T00:00:00Z', ceremonyLabel: 'Umgidi' },
  { direction: 'GIVEN', counterpartyName: '=HYPERLINK("x")', itemDescription: 'Black Label case', quantity: 1, eventDate: '2026-01-05T00:00:00Z' },
]

describe('ukugida book', () => {
  it('writes a spreadsheet, oldest first, safe to open', () => {
    const lines = ukugidaCsv(entries).trim().split('\r\n')
    expect(lines[0]).toBe('Date,Given or received,From or to,Item,Quantity,Unit,Ceremony,Place')
    expect(lines[1]).toBe('2026-01-05,Given,"\'=HYPERLINK(""x"")",Black Label case,1,,,')
    expect(lines[2]).toBe('2026-11-21,Received,"Mam\' Nosipho, ""Gogo""",Klipdrift 750ml,2,bottle,Umgidi,')
  })
  it('escapes names in the printed page', () => {
    const html = ukugidaBookHtml([{ ...entries[0], counterpartyName: '<script>x</script>' }], 'Lwazi')
    expect(html).not.toContain('<script>x')
    expect(html).toContain('&lt;script&gt;')
  })
})
