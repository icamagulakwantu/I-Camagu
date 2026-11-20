import { describe, expect, it } from 'vitest'
import { applyChanges, cleanItems, diffItems } from './templateDiff.js'

const base = [
  { key: 'a', kind: 'task', phase: 'PLANNING', label: 'Call the ingcibi' },
  { key: 'b', kind: 'cost', phase: 'FOOD', label: 'Sheep', quantity: 2, unit: 'sheep', unitCost: 2700 },
  { key: 'c', kind: 'task', phase: 'PLANNING', label: 'Book the tent' },
]

describe('template diff and merge', () => {
  it('finds added, changed and removed items', () => {
    const proposed = [
      { ...base[0] },
      { ...base[1], quantity: 3 },
      { key: 'new-1', kind: 'cost', phase: 'SPIRITUAL', label: 'Imphepho', quantity: 2, unit: 'bundle', unitCost: 45 },
    ]
    const changes = diffItems(base, proposed)
    expect(changes.map((c) => c.id).sort()).toEqual(['add:new-1', 'change:b', 'remove:c'])
    expect(changes.find((c) => c.id === 'change:b').fields).toEqual(['quantity'])
  })

  it('merges only what the owner accepts, keeping the owner\'s later edits', () => {
    const changes = diffItems(base, [{ ...base[0] }, { ...base[1], quantity: 3 }, { key: 'new-1', kind: 'task', phase: 'X', label: 'Imphepho' }])
    // Since the editor started, the owner changed the sheep's price.
    const current = [base[0], { ...base[1], unitCost: 2500 }, base[2]]
    const { items, applied, skipped } = applyChanges(current, changes, ['change:b', 'add:new-1'])
    expect(applied).toEqual(['change:b', 'add:new-1'])
    expect(skipped).toEqual([])
    expect(items.find((i) => i.key === 'b')).toMatchObject({ quantity: 3, unitCost: 2500 })
    expect(items.find((i) => i.key === 'c')).toBeTruthy() // removal not accepted
    expect(items.some((i) => i.label === 'Imphepho')).toBe(true)
  })

  it('skips changes that no longer fit', () => {
    const changes = diffItems(base, [{ ...base[0], label: 'Call the ingcibi early' }, base[1], base[2], { key: 'new-2', kind: 'task', phase: 'PLANNING', label: 'book the tent' }])
    const { skipped } = applyChanges([base[1], base[2]], changes, changes.map((c) => c.id))
    expect(skipped.map((s) => s.reason).sort()).toEqual(['Already in the template', 'No longer in the template'])
  })

  it('cleans bad input', () => {
    expect(cleanItems([{ key: 'x', label: '  ' }, { key: 'y', label: 'Ok', kind: 'cost', quantity: -4 }, { key: 'y', label: 'dup' }]))
      .toEqual([{ key: 'y', kind: 'cost', phase: 'GENERAL', label: 'Ok', isOptional: false, quantity: null, unit: 'item', unitCost: null }])
  })
})
