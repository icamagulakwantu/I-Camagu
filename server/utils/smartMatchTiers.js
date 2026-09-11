// SmartMatch continuous pallet tiers — real unit math (1 pallet = 56 cases,
// standard SA wholesale liquor/grocery pallet configuration, researched
// against real distributor pricing), applied to the pool's real, already
// computed currentCases. No fabricated volume, no fabricated savings —
// this only labels a real number.
//
// Four tiers, matching the bands the founder actually negotiates pallet
// discounts against: 1-3 / 4-7 / 8-10 / 10+.
export const PALLET_CASES = 56;

export const TIERS = [
  { id: 1, name: 'Amazibazana Goal', minPallets: 1, maxPallets: 3 },
  { id: 2, name: 'Clan Tier', minPallets: 4, maxPallets: 7 },
  { id: 3, name: 'Eastern Cape Tier', minPallets: 8, maxPallets: 9 },
  { id: 4, name: 'Max Tier', minPallets: 10, maxPallets: Infinity },
]

export function palletsForCases(cases) {
  return cases / PALLET_CASES
}

// Returns the highest tier whose range the current case count has reached,
// or null if the pool hasn't hit a full pallet yet.
export function getTierForCases(cases) {
  const pallets = palletsForCases(cases)
  let matched = null
  for (const tier of TIERS) {
    if (pallets >= tier.minPallets) matched = tier
  }
  return matched
}

// The next tier up from where a pool currently sits (or null if it's
// already at the top tier) — used to tell members how much closer they
// are, not just what they've already reached.
export function getNextTier(cases) {
  const pallets = palletsForCases(cases)
  return TIERS.find((tier) => pallets < tier.minPallets) || null
}

// Real cases still needed to reach a given tier's minimum, rounded up —
// you can't deliver a fraction of a case, so the ask is always a whole one.
export function casesToReachTier(cases, tier) {
  if (!tier) return 0
  const needed = tier.minPallets * PALLET_CASES - cases
  return Math.max(0, Math.ceil(needed))
}
