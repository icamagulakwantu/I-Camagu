// Seating by groups (founder, 23 Nov 2026): at umgidi, and at every
// ceremony of isiko lakwaXhosa (inkomo, ukukhapha, ukubuyisa, intambo
// enkulu, imbeleko...), each group sits in its own place: ootata apart from
// oomama, abafana apart, and so on. These are the places to start from, in
// order of seniority. Founder, 23 Nov 2026: where each group sits is the
// family's to decide, by how its house is laid out, but ootata are always
// ebuhlanti. So ootata's place is fixed; every other place is a suggestion
// the family changes to its own way.
//
// Sources agree on the shape (docs/research/2026-11-ceremony-order-and-
// seating.md): the men ebuhlanti, in circles by age; the women in the house;
// indlu yesibane for initiated men only. The rest is the founder's list of
// the fourteen groups.
const G = (groupLabel, place) => ({ groupLabel, place })

const ELDERS = [
  G('Ootata', 'Ebuhlanti, the kraal: always'),
  G('Isekela lika Tata', 'Ebuhlanti, beside ootata'),
  G('OoMama', 'Endlini enkulu, the great house: the elder women'),
  G('Isekela lika Mama', 'Endlini enkulu, beside oomama'),
  // Founder: abayeni are the men married to the daughters of the house
  // hosting the ceremony; abafazi are the women married into that house.
  G('Abayeni', 'Their own place: the men married to the daughters of this house'),
  G('Abafazi', 'Near the house, on the kitchen side: the women married into this house'),
]
const YOUNG = [
  G('Abafana belali', 'Their own circle outside, near the kraal: the young men of the village'),
  G('Iintombi zelali', 'Their own place, apart: the girls of the village'),
  G('Abafana bekhaya', 'Serving: the family’s young men help ebuhlanti'),
  G('Iintombi zekhaya', 'Serving: the family’s girls help in the kitchen and serve'),
]
const OTHERS = [
  G('Young boys and girls', 'With the women, or a place of their own'),
  G('Personal friends', 'The tent'),
  G('VIP guests', 'The tent, or the bar'),
]
// Indlu yesibane: initiated men only, so it belongs to umgidi.
const INDLU_YESIBANE = G('Indlu yeSbane', 'Its own room: initiated men only')

const UMGIDI_TYPES = new Set(['ULWALUKO', 'UMGIDI', 'IMIGIDI'])

export function seatingGroupsFor(type) {
  return UMGIDI_TYPES.has(type)
    ? [...ELDERS, ...YOUNG, INDLU_YESIBANE, ...OTHERS]
    : [...ELDERS, ...YOUNG, ...OTHERS]
}

// The place to start from for a group, or null for a group the family added.
export function suggestedPlace(groupLabel) {
  const all = [...ELDERS, ...YOUNG, INDLU_YESIBANE, ...OTHERS]
  return all.find((g) => g.groupLabel === groupLabel)?.place || null
}

// Places that never change, whatever the family's house: ootata ebuhlanti.
const FIXED = { ootata: 'Ebuhlanti, the kraal: always' }

export function fixedPlace(groupLabel) {
  return FIXED[String(groupLabel || '').trim().toLowerCase()] || null
}
