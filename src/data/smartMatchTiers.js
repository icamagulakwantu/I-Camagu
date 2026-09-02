// Mirrors server/utils/smartMatchTiers.js — same real unit math (1 pallet =
// 56 cases), applied to the pool's real currentCases from getMyPoolStatus.
// Display-layer only, no fabricated numbers.
export const PALLET_CASES = 56

export const TIERS = [
  { id: 1, name: 'Amazibazana Goal', minPallets: 1, maxPallets: 3 },
  { id: 2, name: 'Clan Tier', minPallets: 4, maxPallets: 7 },
  { id: 3, name: 'Eastern Cape Tier', minPallets: 8, maxPallets: Infinity },
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
