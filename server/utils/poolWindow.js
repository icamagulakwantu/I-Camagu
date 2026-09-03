// Rolling-window pool sizing — keeps one SmartMatch pool from growing into
// a single unbounded batch during a demand spike (e.g. December). Real
// numbers only: the window length is a fixed constant, the cap scales off
// each partner's own real moqTarget rather than a made-up global figure.
export const POOL_WINDOW_HOURS = 72;
export const POOL_CAP_MULTIPLIER = 4;

// A pool created now gets a real deadline and a real cap derived from the
// partner's actual minimum order quantity — e.g. moqTarget 50 -> capped at
// 200 cases, closing to new baskets after 72 hours either way.
export function newPoolWindow(moqTarget) {
  return {
    deadline: new Date(Date.now() + POOL_WINDOW_HOURS * 60 * 60 * 1000),
    capCases: moqTarget * POOL_CAP_MULTIPLIER,
  };
}

// True once a pool should stop accepting new baskets: its window has
// expired, or its real case count has reached its cap. A pool with no
// deadline/cap (created before this existed) is treated as still open —
// it isn't retroactively closed on existing members.
export function isPoolWindowClosed(pool, currentCases) {
  if (pool.deadline && pool.deadline.getTime() <= Date.now()) return true;
  if (pool.capCases != null && currentCases >= pool.capCases) return true;
  return false;
}
