// SmartMatch tier math — generalised across two ways a wholesaler actually
// negotiates a volume discount:
//
//   PALLETS — alcohol. 1 pallet = 56 cases (standard SA wholesale liquor/
//             grocery pallet configuration, researched against real
//             distributor pricing). This is a fixed policy the founder set
//             across every alcohol pool, not per-supplier — so it has a
//             real global default (DEFAULT_PALLET_TIERS).
//   AMOUNT  — groceries and livestock, which mostly don't come in pallets
//             at all. A produce wholesaler or livestock farmer is more
//             likely to discount off total Rand spent. There's no
//             universal amount ladder the way there is for pallets — every
//             wholesaler negotiates its own bands — so an AMOUNT pool has
//             no default: it shows nothing until a founder enters a real
//             one (see resolveTierLadder).
//
// Every number here is either a fixed, founder-stated policy (the pallet
// bands) or a real figure already on the pool (tierLadder, currentCases,
// currentAmountZAR). No fabricated volume, no fabricated savings.
export const PALLET_CASES = 56;

export const DEFAULT_PALLET_TIERS = [
  { id: 1, name: 'Amazibazana Goal', min: 1, value: null },
  { id: 2, name: 'Clan Tier', min: 4, value: null },
  { id: 3, name: 'Eastern Cape Tier', min: 8, value: null },
  { id: 4, name: 'Max Tier', min: 10, value: null },
];

export function palletsForCases(cases) {
  return cases / PALLET_CASES;
}

// The pool's real tier ladder. A founder-entered pool.tierLadder always
// wins (sorted defensively, since JSON key order isn't guaranteed). Before
// one exists: a PALLETS pool still shows the standard alcohol bands, every
// value null ("TBC"), so the shape is visible immediately; an AMOUNT pool
// resolves to null — there's no honest default to show.
export function resolveTierLadder(pool) {
  if (Array.isArray(pool?.tierLadder) && pool.tierLadder.length > 0) {
    return [...pool.tierLadder].sort((a, b) => a.min - b.min);
  }
  if ((pool?.tierBasis || 'PALLETS') === 'PALLETS') {
    return DEFAULT_PALLET_TIERS;
  }
  return null;
}

// Highest tier a real metric (pallets, or Rand pooled) has reached, or
// null if it hasn't reached the first tier yet (or there's no ladder).
export function getTierForMetric(metric, ladder) {
  if (!ladder) return null;
  let matched = null;
  for (const tier of ladder) if (metric >= tier.min) matched = tier;
  return matched;
}

export function getNextTierForMetric(metric, ladder) {
  if (!ladder) return null;
  return ladder.find((tier) => metric < tier.min) || null;
}

// Real amount of the metric still needed to reach a tier (pallets, or
// Rand — whichever the ladder is measured in). Never negative.
export function amountToReachTier(metric, tier) {
  if (!tier) return 0;
  return Math.max(0, tier.min - metric);
}
