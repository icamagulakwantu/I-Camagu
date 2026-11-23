// Worked examples, open to every member and always marked "Example" (founder,
// 23 Nov 2026). The rules are the founder's own; the prices are dated and
// sourced (docs/research/2026-11-hire-and-stokvels.md). Nothing here is a
// real group or a real person.

const r2 = (n) => Math.round(n * 100) / 100

// ---------------------------------------------------------------------------
// Rules shared by the grocery and the alcohol stokvel (founder): each member
// may lend out what they have contributed, less a R100 retainer left with the
// group, at the interest agreed (usually 30%). The interest comes back to the
// stokvel, which owns it on paper; it covers bad debts and grows the buying
// money. Each member has an interest target; whoever falls short pays the
// difference from their own pocket. Interest is shared equally.
export const LENDING_RULES = {
  interestRate: 0.3,
  retainer: 100,
}

// How much a member may lend out after `months` months of contributions.
export const lendingCap = (monthly, months) => Math.max(0, monthly * months - LENDING_RULES.retainer)

// A member's year: contributions, the interest they raised, and what they
// must top up from their pocket if they missed the interest target.
export function memberYear({ monthly, months, interestRaised, target }) {
  const contributed = monthly * months
  const shortfall = Math.max(0, target - interestRaised)
  return { contributed, interestRaised, shortfall, toGroup: contributed + interestRaised + shortfall }
}

// ---------------------------------------------------------------------------
// 1. Umgidi drinks: an alcohol stokvel buying together through SmartMatch
// (founder's own umgidi as the standard): 50 members, R15,000 each over 10
// months, each taking home 3 cases of Commando brandy, 3 of Old Buck gin, 10
// of beer and 10 of cider. Prices: i-Camagu bulk case prices on 23 Nov 2026.
export const DRINKS_BASKET = [
  { name: 'Commando Brandy', pack: '12 × 750 ml', cases: 3, casePrice: 2349.0 },
  { name: 'Old Buck Gin', pack: '12 × 750 ml', cases: 3, casePrice: 1843.2 },
  { name: 'Black Label quarts (beer)', pack: '12 × 750 ml', cases: 10, casePrice: 279.36 },
  { name: "Hunter's Dry quarts (cider)", pack: '12 × 660 ml', cases: 10, casePrice: 348.0 },
]

export function drinksPoolExample() {
  const members = 50
  const monthly = 1500
  const months = 10
  const target = 4000 // interest each member raises over the 10 months (example target)
  const basket = DRINKS_BASKET.map((b) => ({ ...b, total: r2(b.cases * b.casePrice) }))
  const basketPerMember = r2(basket.reduce((s, b) => s + b.total, 0))
  const savedPerMember = monthly * months
  // Five members shown; the rest are like the first.
  const sample = [
    { name: 'Member 1', raised: 4600 },
    { name: 'Member 2', raised: 4000 },
    { name: 'Member 3', raised: 4250 },
    { name: 'Member 4', raised: 3100 },
    { name: 'Member 5', raised: 2500 },
  ].map((m) => ({ ...m, ...memberYear({ monthly, months, interestRaised: m.raised, target }) }))
  const interestPerMember = target // the pot's interest, shared equally, at least the target each
  const perMemberSpend = savedPerMember + interestPerMember
  return {
    members, monthly, months, target, basket, basketPerMember, savedPerMember,
    interestPerMember, perMemberSpend,
    gapWithoutInterest: r2(basketPerMember - savedPerMember),
    leftoverPerMember: r2(perMemberSpend - basketPerMember),
    pool: basket.map((b) => ({ name: b.name, cases: b.cases * members, total: r2(b.total * members) })),
    poolTotal: r2(basketPerMember * members),
    lendingCapAtEnd: lendingCap(monthly, months),
    sample,
  }
}

// ---------------------------------------------------------------------------
// 2. Grocery umgalelo (founder): R350 a month (R250 fridge, R100 dry food)
// from January to the end of November, 15 members, lending at 30% with the
// R100 retainer, a strict interest target. At year end the groceries are
// bought together; what is left is shared for school uniform and stationery,
// each member bringing receipts so the money is not spent on alcohol.
// Prices: Makro Eastern Cape stokvel deals, 20 Nov to 3 Dec 2025.
export const GROCERY_FRIDGE = [
  { name: 'Frozen chicken thighs, 5 kg (New Era)', qty: 7, price: 229.95 },
  { name: 'Frozen chicken feet, 2 kg (New Era)', qty: 2, price: 64.95 },
  { name: 'Chicken polony, 2.5 kg (Eskort)', qty: 1, price: 139.95 },
  { name: 'Smoked viennas, 1 kg (Eskort)', qty: 2, price: 59.95 },
  { name: 'Milk, 6 × 1 L (Clover)', qty: 2, price: 94.95 },
  { name: 'Sliced cheese, 900 g (Parmalat)', qty: 1, price: 104.95 },
  { name: 'Country spread, 1 kg (Stork)', qty: 2, price: 45.0 },
]
export const GROCERY_DRY = [
  { name: 'Super maize meal, 10 kg (White Star)', qty: 1, price: 94.95 },
  { name: 'Parboiled rice, 10 kg (Spekko)', qty: 1, price: 139.95 },
  { name: 'White sugar, 10 kg (Huletts)', qty: 1, price: 219.95 },
  { name: 'Cake flour, 10 kg (Golden Cloud)', qty: 1, price: 109.95 },
  { name: 'Samp, 10 kg (Champion)', qty: 1, price: 124.95 },
  { name: 'Cooking oil, 2 L (Pan)', qty: 2, price: 54.95 },
  { name: 'Pilchards, 400 g (Lucky Star)', qty: 4, price: 24.16 },
  { name: 'Baked beans, 400 g (Koo)', qty: 4, price: 14.16 },
  { name: 'Teabags, 100s (Joko)', qty: 1, price: 47.49 },
  { name: 'Washing powder, 2 kg (MAQ)', qty: 1, price: 55.95 },
]

export function groceryStokvelExample() {
  const members = 15
  const fridgeMonthly = 250
  const dryMonthly = 100
  const monthly = fridgeMonthly + dryMonthly
  const months = 11 // January to the end of November
  const target = 1000 // interest each member must raise in the year (example target)
  const line = (i) => ({ ...i, total: r2(i.qty * i.price) })
  const fridge = GROCERY_FRIDGE.map(line)
  const dry = GROCERY_DRY.map(line)
  const fridgeTotal = r2(fridge.reduce((s, i) => s + i.total, 0))
  const dryTotal = r2(dry.reduce((s, i) => s + i.total, 0))
  const sample = [
    { name: 'Member 1', raised: 1300 },
    { name: 'Member 2', raised: 1000 },
    { name: 'Member 3', raised: 1150 },
    { name: 'Member 4', raised: 700 },
    { name: 'Member 5', raised: 1000 },
  ].map((m) => ({ ...m, ...memberYear({ monthly, months, interestRaised: m.raised, target }) }))
  const contributed = monthly * months
  // Interest is shared equally: with every member at least on target, each
  // member's share of the interest is at least the target.
  const perMember = contributed + target
  const leftover = r2(perMember - fridgeTotal - dryTotal)
  return {
    members, monthly, fridgeMonthly, dryMonthly, months, target, contributed,
    fridge, dry, fridgeTotal, dryTotal, perMember, leftover,
    lendingCapAtEnd: lendingCap(monthly, months),
    lendingCapMidYear: lendingCap(monthly, 6),
    groupPot: perMember * members,
    sample,
  }
}

// ---------------------------------------------------------------------------
// 2b. Fridge stokvel (founder, 23 Nov 2026, from a real grocery club's
// Bidfood quote): 14 members buy fridge products in one wholesale order and
// split it. In Dec 2023 the order cost R21,578.98 with VAT (R1,541.36 each).
// Today's bulk prices are the Bulk Buy prices (server/scripts/
// fridge-meats-nov-2026.js, read 23 Nov 2026); shop prices only where a
// shop's regular price was checked. Members and contributions are made up.
export const FRIDGE_2023 = { total: 21578.98, members: 14, date: '7 Dec 2023' }
// cases: what the whole group orders; shop: the same amount in a shop, or
// null where no shelf price was checked.
export const FRIDGE_BASKET = [
  { name: 'Burger patties', pack: 'box of 20 × 90 g', cases: 14, casePrice: 74.77, shop: 129.99 },
  { name: 'Russians (short)', pack: 'case of 5 × 1 kg', cases: 14, casePrice: 442.57, shop: null },
  { name: 'Cheese grillers', pack: 'case of 12 × 500 g', cases: 14, casePrice: 665.21, shop: 1079.88 },
  { name: 'Back bacon', pack: 'case of 6 × 1 kg', cases: 7, casePrice: 555.64, shop: null },
  { name: 'French polony', pack: '3 kg loaf', cases: 14, casePrice: 79.05, shop: 143.97 },
  { name: 'Ham & tongue', pack: '2 kg loaf', cases: 14, casePrice: 91.99, shop: 189.98 },
]

export function fridgeStokvelExample() {
  const members = 14
  const monthly = 150
  const months = 11 // January to the end of November
  const lines = FRIDGE_BASKET.map((b) => {
    const share = b.cases / members // what one member takes home, in packs
    return { ...b, share, total: r2(b.cases * b.casePrice), perMember: r2(share * b.casePrice), shopPerMember: b.shop == null ? null : r2(share * b.shop) }
  })
  const groupTotal = r2(lines.reduce((s, l) => s + l.total, 0))
  const perMember = r2(groupTotal / members)
  const checked = lines.filter((l) => l.shopPerMember != null)
  const checkedBulk = r2(checked.reduce((s, l) => s + l.perMember, 0))
  const checkedShop = r2(checked.reduce((s, l) => s + l.shopPerMember, 0))
  const contributed = monthly * months
  return {
    members, monthly, months, contributed, lines, groupTotal, perMember,
    checkedBulk, checkedShop, savedOnChecked: r2(checkedShop - checkedBulk),
    leftover: r2(contributed - perMember),
    was2023: { ...FRIDGE_2023, perMember: r2(FRIDGE_2023.total / FRIDGE_2023.members) },
  }
}

// ---------------------------------------------------------------------------
// 3. A society (club): money only, from R100 a month with no maximum. Each
// member raises their own interest and at year end takes home their own
// contributions plus their own interest (founder).
export function societyExample() {
  const months = 11
  const members = [
    { name: 'Member 1', monthly: 100, interest: 450 },
    { name: 'Member 2', monthly: 250, interest: 900 },
    { name: 'Member 3', monthly: 500, interest: 1800 },
    { name: 'Member 4', monthly: 1000, interest: 2600 },
    { name: 'Member 5', monthly: 300, interest: 0 },
  ].map((m) => ({ ...m, contributed: m.monthly * months, payout: m.monthly * months + m.interest }))
  return { months, minimum: 100, members, total: members.reduce((s, m) => s + m.payout, 0) }
}
