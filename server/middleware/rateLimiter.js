const attempts = new Map();

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
