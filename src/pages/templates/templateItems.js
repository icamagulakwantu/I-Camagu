import { phaseLabel, phaseOrder } from '../../../shared/ceremonyList.js'

// Items grouped by phase, in the order the phases first appear.
export function groupByPhase(items) {
  const groups = []
  const byPhase = new Map()
  for (const item of items || []) {
    if (!byPhase.has(item.phase)) {
      const group = { phase: item.phase, title: phaseLabel(item.phase), items: [] }
      byPhase.set(item.phase, group)
      groups.push(group)
    }
    byPhase.get(item.phase).items.push(item)
  }
  return groups
    .map((g, index) => ({ g, index, order: phaseOrder(g.phase) }))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({ g }) => g)
}

export const FIELD_NAMES = { phase: 'Stage', label: 'Name', quantity: 'How many', unit: 'Unit', unitCost: 'Price each', isOptional: 'Optional' }

export function describeValue(field, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'unitCost') return `R${Number(value).toLocaleString('en-ZA')}`
  if (field === 'isOptional') return value ? 'Yes' : 'No'
  if (field === 'phase') return phaseLabel(value)
  return String(value)
}
