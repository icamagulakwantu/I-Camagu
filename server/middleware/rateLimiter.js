const attempts = new Map();

// Without this, every distinct IP+path ever seen stays in the Map for the
// life of the process — a slow leak that grows with traffic. Expired records
// are useless once their window has passed, so drop them periodically.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now > record.resetAt) attempts.delete(key);
  }
}, SWEEP_INTERVAL_MS);
// Don't hold the event loop open on shutdown.
sweep.unref?.();

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const record = attempts.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count += 1;
    attempts.set(key, record);

    if (record.count > max) {
      const retrySeconds = Math.ceil((record.resetAt - now) / 1000);
      return res.status(429).json({ error: `Too many attempts. Try again in ${retrySeconds} seconds.` });
    }
    next();
  };
}
