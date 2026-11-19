// Umnombo: a person's line of ancestors, father first, back as far as the
// family knows. Two people of the same clan who name the same ancestor
// meet at that ancestor; the generations show how far back.

export const MAX_GENERATIONS = 15
export const MAX_NAME = 80

// Plain names for the first generations back; after that, a number.
export const GENERATION_NAMES = ['Father · uTata', 'Grandfather · uTatomkhulu', 'Great-grandfather · uKhokho']
export const generationName = (g) => GENERATION_NAMES[g - 1] || `${g} generations back`

// Lower-case, no punctuation or extra spaces: "Ngubengcuka " and
// "ngubengcuka" are the same man. Titles like "Tat'" or "uTata" are not
// stripped: families write names their own way, so only exact names match.
export function normaliseAncestor(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Cleans what a member saved: names and places trimmed and capped,
// generations 1..MAX in order, empty rows dropped, one ancestor per
// generation.
export function cleanLineage(input) {
  const rows = Array.isArray(input) ? input : []
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const generation = Math.floor(Number(row?.generation))
    const name = String(row?.name || '').trim().slice(0, MAX_NAME)
    const place = String(row?.place || '').trim().slice(0, MAX_NAME)
    if (!name || !(generation >= 1 && generation <= MAX_GENERATIONS) || seen.has(generation)) continue
    seen.add(generation)
    out.push(place ? { generation, name, place } : { generation, name })
  }
  return out.sort((a, b) => a.generation - b.generation)
}

// The ancestors two lines share, nearest first. Only names that are at
// least three letters long count, so an initial never makes a match.
export function sharedAncestors(mine, theirs) {
  const theirsByName = new Map()
  for (const a of cleanLineage(theirs)) {
    const key = normaliseAncestor(a.name)
    if (key.replace(/[^a-z]/g, '').length >= 3 && !theirsByName.has(key)) theirsByName.set(key, a)
  }
  const shared = []
  for (const a of cleanLineage(mine)) {
    const other = theirsByName.get(normaliseAncestor(a.name))
    if (other) shared.push({ name: a.name, myGeneration: a.generation, theirGeneration: other.generation })
  }
  return shared.sort((x, y) => x.myGeneration - y.myGeneration)
}
