import { describe, expect, it } from 'vitest'
import { cleanLineage, generationName, sharedAncestors } from './lineage.js'

describe('umnombo', () => {
  it('cleans rows: drops empty and duplicate generations, sorts, caps', () => {
    expect(cleanLineage([
      { generation: 2, name: ' Mlungisi ', place: 'Tsolo' },
      { generation: 1, name: 'Sipho' },
      { generation: 1, name: 'Duplicate' },
      { generation: 3, name: '' },
      { generation: 99, name: 'Too far' },
    ])).toEqual([{ generation: 1, name: 'Sipho' }, { generation: 2, name: 'Mlungisi', place: 'Tsolo' }])
    expect(cleanLineage('nonsense')).toEqual([])
  })
  it('finds the shared ancestor and how far back each line meets him', () => {
    const mine = [{ generation: 1, name: 'Sipho' }, { generation: 4, name: 'Ngubengcuka' }]
    const theirs = [{ generation: 1, name: 'Thando' }, { generation: 6, name: 'ngubengcuka ' }]
    expect(sharedAncestors(mine, theirs)).toEqual([{ name: 'Ngubengcuka', myGeneration: 4, theirGeneration: 6 }])
  })
  it('never matches on an initial', () => {
    expect(sharedAncestors([{ generation: 1, name: 'M.' }], [{ generation: 1, name: 'm' }])).toEqual([])
  })
  it('names the first generations', () => {
    expect(generationName(1)).toMatch(/Father/)
    expect(generationName(8)).toBe('8 generations back')
  })
})
