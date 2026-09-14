// Pool sizing — keeps one SmartMatch pool from growing into a single
// unbounded batch during a demand spike (e.g. December). Real numbers
// only: the cap scales off the pool's own real moqTarget, never a made-up
// global figure.
export const POOL_CAP_MULTIPLIER = 4;

// A pool's expiry is solely the target date whoever started it chose —
// e.g. "this is for December" — not a fixed universal timer. No target
// date means no expiry: the pool just stays open (still bounded by
// capCases below) until it either fills or someone sets a real date.
export function newPoolWindow(moqTarget, targetDate) {
  return {
    deadline: targetDate ? new Date(targetDate) : null,
    capCases: moqTarget * POOL_CAP_MULTIPLIER,
  };
}

// True once a pool should stop accepting new baskets: its target date has
// passed, or its real case count has reached its cap. A pool with no
// deadline (no target date was ever set for it) is treated as open-ended —
// it never closes on time alone.
export function isPoolWindowClosed(pool, currentCases) {
  if (pool.deadline && pool.deadline.getTime() <= Date.now()) return true;
  if (pool.capCases != null && currentCases >= pool.capCases) return true;
  return false;
}
