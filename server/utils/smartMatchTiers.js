// Keep the historical server import path stable while sharing the same tier
// rules with browser components. The shared module has no server-only imports.
export {
  PALLET_CASES,
  DEFAULT_PALLET_TIERS,
  palletsForCases,
  resolveTierLadder,
  getTierForMetric,
  getNextTierForMetric,
  amountToReachTier,
} from '../../shared/smartMatchTiers.js';
