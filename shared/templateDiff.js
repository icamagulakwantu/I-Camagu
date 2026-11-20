// Template collaboration: an editor's proposed version of a template is
// compared with the version it started from, and the owner merges the
// changes they accept into the template as it is now.
//
// An item: { key, kind: 'task' | 'cost', phase, label, quantity?, unit?,
// unitCost?, isOptional? }. `key` is the template row's id; items an editor
// adds get a key starting with "new-".

export const MAX_ITEMS = 400
const MAX_LABEL = 160
const MAX_TEXT = 60
const MAX_NUMBER = 10_000_000
export const FIELDS = ['phase', 'label', 'quantity', 'unit', 'unitCost', 'isOptional']

const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const num = (value) => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= MAX_NUMBER ? Math.round(n * 100) / 100 : null
}

// Cleans a list from a client: drops items without a label, caps sizes,
// keeps one item per key.
export function cleanItems(list) {
  const out = []
  const seen = new Set()
  for (const raw of Array.isArray(list) ? list.slice(0, MAX_ITEMS) : []) {
    const label = text(raw?.label, MAX_LABEL)
    const key = text(raw?.key, 64)
    if (!label || !key || seen.has(key)) continue
    seen.add(key)
    const kind = raw?.kind === 'cost' ? 'cost' : 'task'
    const item = { key, kind, phase: text(raw?.phase, MAX_TEXT) || 'GENERAL', label, isOptional: Boolean(raw?.isOptional) }
    if (kind === 'cost') {
      item.quantity = num(raw?.quantity)
      item.unit = text(raw?.unit, MAX_TEXT) || 'item'
      item.unitCost = num(raw?.unitCost)
    }
    out.push(item)
  }
  return out
}

const same = (a, b) => (a ?? null) === (b ?? null)
const changedFields = (before, after) => FIELDS.filter((f) => !same(before[f], after[f]))

// What the editor changed, item by item.
export function diffItems(base, proposed) {
  const baseByKey = new Map(cleanItems(base).map((i) => [i.key, i]))
  const proposedList = cleanItems(proposed)
  const proposedKeys = new Set(proposedList.map((i) => i.key))
  const changes = []
  for (const item of proposedList) {
    const before = baseByKey.get(item.key)
    if (!before) changes.push({ id: `add:${item.key}`, type: 'add', key: item.key, after: item })
    else {
      const fields = changedFields(before, item)
      if (fields.length) changes.push({ id: `change:${item.key}`, type: 'change', key: item.key, before, after: item, fields })
    }
  }
  for (const [key, before] of baseByKey) {
    if (!proposedKeys.has(key)) changes.push({ id: `remove:${key}`, type: 'remove', key, before })
  }
  return changes
}

const sameThing = (a, b) => a.kind === b.kind && a.label.toLowerCase() === b.label.toLowerCase()

// Applies the accepted changes to the template as it is now. A change only
// touches the fields the editor changed, so the owner's own later edits to
// other fields stay. Changes that no longer fit are skipped, with a reason.
export function applyChanges(current, changes, acceptIds) {
  const accept = new Set(acceptIds || [])
  const items = cleanItems(current).map((i) => ({ ...i }))
  const applied = []
  const skipped = []
  for (const change of changes) {
    if (!accept.has(change.id)) continue
    const index = items.findIndex((i) => i.key === change.key)
    if (change.type === 'add') {
      if (items.some((i) => sameThing(i, change.after))) { skipped.push({ id: change.id, reason: 'Already in the template' }); continue }
      items.push({ ...change.after })
      applied.push(change.id)
    } else if (change.type === 'remove') {
      if (index === -1) { skipped.push({ id: change.id, reason: 'Already removed' }); continue }
      items.splice(index, 1)
      applied.push(change.id)
    } else if (change.type === 'change') {
      if (index === -1) { skipped.push({ id: change.id, reason: 'No longer in the template' }); continue }
      for (const f of change.fields) items[index][f] = change.after[f]
      applied.push(change.id)
    }
  }
  return { items, applied, skipped }
}
