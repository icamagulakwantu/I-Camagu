// Mirrors server/utils/smartMatchTiers.js — same real unit math (1 pallet =
// 56 cases), applied to the pool's real currentCases from getMyPoolStatus.
// Display-layer only, no fabricated numbers.
//
// Four tiers, matching the bands the founder actually negotiates pallet
// discounts against: 1-3 / 4-7 / 8-10 / 10+.
export const PALLET_CASES = 56

export const TIERS = [
  { id: 1, name: 'Amazibazana Goal', minPallets: 1, maxPallets: 3 },
  { id: 2, name: 'Clan Tier', minPallets: 4, maxPallets: 7 },
  { id: 3, name: 'Eastern Cape Tier', minPallets: 8, maxPallets: 9 },
  { id: 4, name: 'Max Tier', minPallets: 10, maxPallets: Infinity },
]

export function palletsForCases(cases) {
  return cases / PALLET_CASES
}

export function getTierForCases(cases) {
  const pallets = palletsForCases(cases)
  let matched = null
  for (const tier of TIERS) {
    if (pallets >= tier.minPallets) matched = tier
  }
  return matched
}

// The next tier up from where a pool currently sits (or null if it's
// already at the top tier).
export function getNextTier(cases) {
  const pallets = palletsForCases(cases)
  return TIERS.find((tier) => pallets < tier.minPallets) || null
}

// Real cases still needed to reach a given tier's minimum, rounded up.
export function casesToReachTier(cases, tier) {
  if (!tier) return 0
  const needed = tier.minPallets * PALLET_CASES - cases
  return Math.max(0, Math.ceil(needed))
}
