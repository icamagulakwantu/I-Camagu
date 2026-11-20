import { describe, expect, it } from 'vitest'
import { planDocumentHtml, templateDocumentHtml, templateRowsToItems } from './printDoc.js'

describe('printable plan and template', () => {
  it('lists the plan by stage with ticks, prices and totals, escaped', () => {
    const html = planDocumentHtml({
      title: 'Umgidi <kaSoso>', typeName: 'Umgidi', ceremony: { eventDate: '2027-06-20', guestCount: 150, budgetZAR: 40000 },
      rows: [
        { kind: 'cost', phase: 'UMGIDI', label: 'Sheep', quantity: 3, suggested: 8100, actual: null, done: false },
        { kind: 'task', phase: 'UMGIDI', label: 'Hire chairs', actual: 900, done: true },
        { kind: 'note', phase: 'UMGIDI', label: 'ignored note', done: false },
      ],
      summary: { spent: 900 },
    })
    expect(html).toContain('Umgidi &lt;kaSoso&gt;')
    expect(html).toContain('150 guests')
    expect(html).toContain('1 of 2 done')
    expect(html).toContain('R40')
    expect(html).toContain('Sheep (3)')
    expect(html).toContain('paid R900')
    expect(html).not.toContain('ignored note')
  })
  it('turns template rows into a printable list', () => {
    const items = templateRowsToItems([{ phase: 'FOOD', label: 'Sheep', notes: JSON.stringify({ templateKind: 'cost', quantity: 2, unit: 'sheep', unitCost: 2700 }) }, { phase: 'PLANNING', label: 'Call', notes: 'not json' }])
    expect(items).toEqual([{ kind: 'cost', phase: 'FOOD', label: 'Sheep', quantity: 2, unit: 'sheep', unitCost: 2700 }, { kind: 'task', phase: 'PLANNING', label: 'Call' }])
    expect(templateDocumentHtml({ title: 'T', items })).toContain('Sheep (2 sheep)')
  })
})
