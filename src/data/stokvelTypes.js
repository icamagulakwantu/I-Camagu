// One name and one explanation for each stokvel type, used everywhere a type
// is shown (create form, stokvel header, nearby list, welcome tour), so the
// app never shows a raw code such as "UMGALELO ROTATING".
export const STOKVEL_TYPES = [
  {
    id: 'UMGALELO_ROTATING',
    label: 'Umgalelo · rotation',
    short: 'Rotation',
    purpose: 'Everyone pays the same amount, and each round one member takes the whole pot as a lump sum. Ten of you pay R1,000 a month: each month one of you takes R10,000, to spend on something you can see.',
  },
  {
    id: 'GROCERY_STOKVEL',
    label: 'Grocery stokvel',
    short: 'Groceries',
    purpose: 'Members save through the year and buy groceries together in bulk. SmartMatch joins your order with other stokvels near you for a bigger discount.',
  },
  {
    id: 'ALCOHOL_BULK_POOL',
    label: 'Alcohol stokvel',
    short: 'Alcohol',
    purpose: 'Members save and buy drinks together in bulk for ceremonies and the festive season, through SmartMatch.',
  },
  {
    id: 'BURIAL_SOCIETY',
    label: 'Burial society · umbutho',
    short: 'Burial society',
    purpose: 'Members pay in every month, so that when someone passes on the family has money and help for the funeral.',
  },
  {
    id: 'CEREMONY_SAVINGS',
    label: 'Family saving for a ceremony',
    short: 'Ceremony savings',
    purpose: 'Friends and family save together for a ceremony such as umgidi, a wedding or imbeleko.',
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
