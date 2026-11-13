// One name and one explanation for each stokvel type, used everywhere a type
// is shown (create form, stokvel header, nearby list, welcome tour), so the
// app never shows a raw code such as "UMGALELO ROTATING".
export const STOKVEL_TYPES = [
  {
    id: 'UMGALELO_ROTATING',
    label: 'Umgalelo · rotating payout',
    short: 'Rotating payout',
    purpose: 'Everyone pays in each month and one member receives the pot in turn.',
  },
  {
    id: 'CEREMONY_SAVINGS',
    label: 'Ceremony savings',
    short: 'Ceremony savings',
    purpose: 'Members save together for ceremonies such as umgidi, funerals and weddings.',
  },
  {
    id: 'ALCOHOL_BULK_POOL',
    label: 'Bulk buying club',
    short: 'Bulk buying',
    purpose: 'Members buy drinks together in bulk to save money.',
  },
  {
    id: 'RECIPROCAL_GIFTING',
    label: 'Gift sharing',
    short: 'Gift sharing',
    purpose: 'Members give to each other at ceremonies and are repaid in kind.',
  },
  {
    id: 'EXISTING_STOKVEL_UPGRADE',
    label: 'Bring an existing stokvel',
    short: 'Community stokvel',
    purpose: 'An existing stokvel that now keeps its records on i-Camagu.',
  },
]

const BY_ID = Object.fromEntries(STOKVEL_TYPES.map((type) => [type.id, type]))

export function stokvelType(id) {
  return BY_ID[id] || { id, label: 'Stokvel', short: 'Stokvel', purpose: '' }
}
