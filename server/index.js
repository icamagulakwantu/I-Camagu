import 'dotenv/config';
import portalRoutes from './routes/portal.js';
import ukusokaRoutes from './routes/ukusoka.js';
import publicRoutes from './routes/public.js';
import stokvelRoutes from './routes/stokvel.js';
import legendRoutes from './routes/legend.js';
import hierarchyRoutes from './routes/hierarchy.js';
import ekoyiniRoutes from './routes/ekoyini.js';
import expenditureRoutes from './routes/expenditure.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './config/db.js';
import { ensureCeremonyBudgetColumns } from './scripts/ensure-schema.js';
import { backfillHennessyProductImages } from './scripts/backfill-hennessy-product-images.js';
import { backfillRequestedProductImages } from './scripts/backfill-requested-product-images.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import izidukoRoutes from './routes/iziduko.js';
import reconciliationRoutes from './routes/reconciliation.js';
import notificationRoutes from './routes/notification.js';
import basketRoutes from './routes/basket.js';
import ceremonyRoutes from './routes/ceremony.js';
import reciprocityRoutes from './routes/reciprocity.js';
import activityRoutes from './routes/activity.js';
import directoryRoutes from './routes/directory.js';
import accountRoutes from './routes/account.js';
import supplierRoutes from './routes/supplier.js';
import identityRoutes from './routes/identity.js';
import webhookRoutes from './routes/webhooks.js';
import messageRoutes from './routes/message.js';
import { checkRequiredEnvVars, envStatus } from './config/envCheck.js';
import { initSentry, captureException, flush as flushSentry } from './config/sentry.js';
import { installFatalHandlers } from './config/processHandlers.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

checkRequiredEnvVars();
await initSentry();

// DB-03: an uncaught error leaves the process in an unknown state (it may be
// half-way through a change). Report it and exit so Render starts a clean one.
installFatalHandlers({ captureException, flush: flushSentry });

const app = express();
const PORT = process.env.PORT || 3000;

// DB-02: set once the start-up schema check has finished. Until then, or if
// it failed, /api/health answers 503 so Render does not treat a broken new
// deploy as healthy (the previous deploy keeps serving instead).
const startup = { schemaReady: false, schemaError: null };

// Render terminates TLS and proxies every request through its own edge —
// without this, req.ip (and the rate limiter keyed on it, see
// middleware/rateLimiter.js) resolves to Render's proxy, not the real
// client. Every user would then share one rate-limit bucket per route:
// five login attempts total, from anyone, would 429-lock out the entire
// app. Trusting exactly one hop (Render's own proxy) makes Express read
// the real client IP from X-Forwarded-For instead.
app.set('trust proxy', 1);

// The frontend is served by this same Express process, so ordinary app
// traffic is same-origin and sends no Origin header at all — those requests
// (and native/webview clients) must keep working. Anything that DOES send an
// Origin is a real cross-site caller and has to be on the allowlist, rather
// than reflecting whatever origin asked, which is what `origin: true` did.
const ALLOWED_ORIGINS = [
  'https://i-camagu-1.onrender.com',
  'https://i-camagu.onrender.com',
  'https://i-camagu.co.za',
  'https://www.i-camagu.co.za',
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);

// API routes
app.get('/api/health', async (req, res) => {
  if (!startup.schemaReady) {
    return res.status(503).json({
      status: 'starting',
      message: startup.schemaError
        ? 'Server running, but the start-up database check failed. See server logs.'
        : 'Server starting, database check still running',
    });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', message: 'iCamagu server running, database connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(500).json({ status: 'error', message: 'Server running, but database connection failed' });
  }
});

// Which env vars are set — true/false only, never values. Deliberately
// unauthenticated: login itself may be the thing broken when this is needed.
app.get('/api/health/env', (req, res) => {
  res.json(envStatus());
});

app.use('/api/auth', authRoutes);
app.use('/api/ukusoka', ukusokaRoutes);
app.use('/api/user', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/iziduko', izidukoRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/basket', basketRoutes);
app.use('/api/ceremonies', ceremonyRoutes);
app.use('/api/reciprocity', reciprocityRoutes);
app.use('/api/portals', portalRoutes);
app.use('/api/legends', legendRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/ekoyini', ekoyiniRoutes);
app.use('/api/stokvels', stokvelRoutes);
app.use('/api/expenditure', expenditureRoutes);
app.use('/api/directory', directoryRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/messages', messageRoutes);

// Serve the built frontend
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Last-resort handler. Express 4 doesn't catch errors thrown from async
// handlers, but a synchronous throw or a next(err) would otherwise fall
// through to Express's default handler, which leaks a stack trace to the
// client in non-production. Log the detail, return a generic message.
app.use((err, req, res, next) => {
  console.error(`Unhandled error on ${req.method} ${req.path}:`, err?.message, err?.stack);
  captureException(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

// Start listening straight away so Render sees the port, but report
// "not ready" until the schema check passes.
//
// NOT a retry loop, deliberately: boot-time DB failures here have been real
// bad-credentials errors against Supabase's pooler, and retrying trips its
// circuit breaker ("too many authentication failures"), which can take down
// ordinary request traffic too. Fix DATABASE_URL at the source instead.
app.listen(PORT, () => {
  console.log(`iCamagu server listening on port ${PORT}`);
});

try {
  // budgetZAR/isPurchased and friends are columns the Prisma client expects
  // on every query — they must exist before the app is reported healthy.
  await ensureCeremonyBudgetColumns();
  startup.schemaReady = true;
  console.log('Start-up database check passed.');
} catch (err) {
  startup.schemaError = err;
  console.error(`Start-up database check FAILED — name=${err?.name} code=${err?.code} message=${err?.message}`);
  captureException(err);
}

if (startup.schemaReady) {
  // A tightly scoped, idempotent correction for three known bad product images.
  // This is deliberately separate from the broad catalogue maintenance suite.
  try {
    await backfillHennessyProductImages();
  } catch (err) {
    console.error('Hennessy product image correction failed:', err?.message);
  }
  // Apply only the explicitly audited product-image mappings. This does not
  // alter prices, formats, quantities, orders, or other catalogue fields.
  try {
    await backfillRequestedProductImages();
  } catch (err) {
    console.error('Requested product image correction failed:', err?.message);
  }
}

// DB-02: the ~25 catalogue data repairs no longer run on every start. Run
// them by hand (node server/scripts/run-maintenance.js) or set
// RUN_BOOT_MAINTENANCE=true for a single deploy, then remove it.
if (startup.schemaReady && process.env.RUN_BOOT_MAINTENANCE === 'true') {
  console.warn('RUN_BOOT_MAINTENANCE=true: running catalogue maintenance. Remove this setting after this deploy.');
  const { runMaintenance } = await import('./scripts/maintenance.js');
  runMaintenance()
    .then((failed) => console.log(`Boot maintenance finished${failed.length ? ` with failures: ${failed.join(', ')}` : ''}.`))
    .catch((err) => console.error('Boot maintenance crashed:', err?.message));
}
