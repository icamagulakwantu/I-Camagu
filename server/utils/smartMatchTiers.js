// SmartMatch continuous pallet tiers — real unit math (1 pallet = 56 cases,
// standard SA wholesale liquor/grocery pallet configuration, researched
// against real distributor pricing), applied to the pool's real, already
// computed currentCases. No fabricated volume, no fabricated savings —
// this only labels a real number.
export const PALLET_CASES = 56;

export const TIERS = [
  { id: 1, name: 'Amazibazana Goal', minPallets: 1, maxPallets: 3 },
  { id: 2, name: 'Clan Tier', minPallets: 4, maxPallets: 7 },
  { id: 3, name: 'Eastern Cape Tier', minPallets: 8, maxPallets: Infinity },
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
