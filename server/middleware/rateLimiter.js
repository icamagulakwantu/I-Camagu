import { createHash } from 'node:crypto';

// Rate limiting for sign-in, PIN, invite and public pledge routes.
//
// Counts live in PostgreSQL so every server instance shares them: two Render
// services, or a restart, must not each get a fresh allowance. One atomic
// upsert per request counts the hit, so simultaneous requests cannot slip
// past the limit together. If the database cannot be reached, the limiter
// falls back to counting in this process's memory rather than letting every
// request through. Tests, and machines without DATABASE_URL, use memory only.

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// ---------- Memory store (per process) ----------

const attempts = new Map();

// Without this, every distinct IP+path ever seen stays in the Map for the
// life of the process. Expired records are useless once their window has
// passed, so drop them periodically.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now > record.resetAt) attempts.delete(key);
  }
}, SWEEP_INTERVAL_MS);
// Don't hold the event loop open on shutdown.
sweep.unref?.();

export const memoryStore = {
  hit(key, windowMs) {
    const now = Date.now();
    const record = attempts.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }
    record.count += 1;
    attempts.set(key, record);
    return { count: record.count, resetAt: record.resetAt };
  },
};

// ---------- PostgreSQL store (shared by every instance) ----------

let tableReady = null;
let lastCleanup = 0;

async function db() {
  const { default: prisma } = await import('../config/db.js');
  return prisma;
}

function ensureTable(prisma) {
  if (!tableReady) {
    tableReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RateLimitCounter" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "count" INTEGER NOT NULL,
        "resetAt" TIMESTAMP(3) NOT NULL
      );
    `).catch((err) => { tableReady = null; throw err; });
  }
  return tableReady;
}

export const postgresStore = {
  async hit(key, windowMs) {
    const prisma = await db();
    await ensureTable(prisma);
    const windowSeconds = windowMs / 1000;
    // Start a fresh window when the old one has passed; otherwise add one.
    const rows = await prisma.$queryRaw`
      INSERT INTO "RateLimitCounter" ("key", "count", "resetAt")
      VALUES (${key}, 1, NOW() + make_interval(secs => ${windowSeconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitCounter"."resetAt" <= NOW() THEN 1 ELSE "RateLimitCounter"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitCounter"."resetAt" <= NOW() THEN NOW() + make_interval(secs => ${windowSeconds}) ELSE "RateLimitCounter"."resetAt" END
      RETURNING "count", "resetAt"
    `;
    const now = Date.now();
    if (now - lastCleanup > SWEEP_INTERVAL_MS) {
      lastCleanup = now;
      prisma.$executeRaw`DELETE FROM "RateLimitCounter" WHERE "resetAt" < NOW()`.catch(() => {});
    }
    return { count: Number(rows[0].count), resetAt: new Date(rows[0].resetAt).getTime() };
  },
};

// Shared counting, falling back to memory if the database is unavailable.
export const sharedStore = {
  async hit(key, windowMs) {
    try {
      return await postgresStore.hit(key, windowMs);
    } catch (err) {
      console.error(`Rate limiter: shared store unavailable, counting in memory (${err?.code || err?.message || err})`);
      return memoryStore.hit(key, windowMs);
    }
  },
};

const useMemoryOnly = process.env.NODE_ENV === 'test'
  || process.env.RATE_LIMIT_STORE === 'memory'
  || !process.env.DATABASE_URL;
const defaultStore = useMemoryOnly ? memoryStore : sharedStore;

// Visitors' IP addresses are personal information, so the stored key holds a
// hash of the address and route, never the address itself.
export function limiterKey(req) {
  // Use Express's route template rather than the concrete URL. Otherwise
  // callers can evade a per-route limit by changing path parameters (for
  // example, trying a different inviteId on every request).
  const routeKey = req.route?.path || req.path;
  const raw = `${req.ip}:${req.baseUrl || ''}:${req.method || 'GET'}:${routeKey}`;
  return createHash('sha256').update(raw).digest('hex');
}

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, store = defaultStore } = {}) {
  const decide = (res, next, { count, resetAt }) => {
    if (count > max) {
      const retrySeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      res.set?.('Retry-After', String(retrySeconds));
      return res.status(429).json({ error: `Too many attempts. Try again in ${retrySeconds} seconds.` });
    }
    return next();
  };

  return (req, res, next) => {
    const result = store.hit(limiterKey(req), windowMs);
    // The memory store answers at once; the shared store answers later.
    if (typeof result?.then !== 'function') return decide(res, next, result);
    return result.then((value) => decide(res, next, value), next);
  };
}
