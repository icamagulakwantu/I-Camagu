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
import { backfillBrandImages } from './scripts/backfill-brand-images.js';
import { backfillSpiritPricing } from './scripts/backfill-spirit-pricing.js';
import { backfillCeremonySkus } from './scripts/backfill-ceremony-skus.js';
import { backfillCatalogueExpansion } from './scripts/backfill-catalogue-expansion.js';
import { backfillGroceryBulkCatalog } from './scripts/backfill-grocery-bulk-catalog.js';
import { backfillClothingSkus } from './scripts/backfill-clothing-skus.js';
import { backfillMoninSyrups } from './scripts/backfill-monin-syrups.js';
import { backfillBulkUnits, backfillVerifiedRetailPrices } from './scripts/backfill-bulk-units.js';
import { backfillQuartGaps } from './scripts/backfill-quart-gaps.js';
import { backfillExtractedBrandPhotos } from './scripts/backfill-extracted-brand-photos.js';
import { clearBrokenBrandPhotos } from './scripts/clear-broken-brand-photos.js';
import { backfillFormatSpecificPhotos } from './scripts/backfill-format-specific-photos.js';
import { fixBeerQuartFormats } from './scripts/fix-beer-quart-formats.js';
import { fixSavannaDryFormat } from './scripts/fix-savanna-dry-format.js';
import { backfillFounderSourcedSkus } from './scripts/backfill-founder-sourced-skus.js';
import { splitBundledFlavourSkus } from './scripts/split-bundled-flavour-skus.js';
import { removeNonexistentSkus } from './scripts/remove-nonexistent-skus.js';
import { removeNonexistentFormats } from './scripts/remove-nonexistent-formats.js';
import { renameMislabeledSkus } from './scripts/rename-mislabeled-skus.js';
import { fixAboveRetailPricing } from './scripts/fix-above-retail-pricing.js';
import { backfillSedgwicks } from './scripts/backfill-sedgwicks.js';
import { ensureCeremonyBudgetColumns } from './scripts/ensure-schema.js';
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
import { initSentry, captureException } from './config/sentry.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

checkRequiredEnvVars();
await initSentry();

const app = express();
const PORT = process.env.PORT || 3000;

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

// A rejected promise nobody caught would otherwise terminate the process on
// modern Node — taking the whole app down for every user over one bad
// request. Log it and stay up; Render restarts on a real crash anyway.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason?.message || reason);
  captureException(reason instanceof Error ? reason : new Error(String(reason)));
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err?.message, err?.stack);
  captureException(err);
});

// budgetZAR/isPurchased are new columns the Prisma client's default SELECT
// now expects on every Ceremony/CeremonyCostItem query — must exist before
// the app accepts traffic, not just before the routes that use them.
//
// NOT a retry loop, deliberately: every boot-time DB call has been failing
// with "Authentication failed... the provided database credentials for
// `postgres` are not valid" against Supabase's pooler — a real bad-
// credentials error, not a transient cold-start blip. Retrying it hammers
// the pooler and trips its circuit breaker ("too many authentication
// failures, new connections are temporarily blocked"), which risks taking
// down ordinary request traffic too. This needs DATABASE_URL fixed at the
// source (Render env var / Supabase DB password), not client-side retries.
function logBackfillError(label, err) {
  console.error(`${label} failed — name=${err?.name} code=${err?.code} message=${err?.message}`);
}

ensureCeremonyBudgetColumns()
  .catch((err) => {
    logBackfillError('Ceremony budget schema check', err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`iCamagu server listening on port ${PORT}`);
    });

    // Idempotent — safe to run on every boot, once DATABASE_URL is fixed.
    // Sequential, not concurrent, so they don't pile onto the pooler at once.
    (async () => {
      await fixBeerQuartFormats().catch((err) => {
        logBackfillError('Beer quart format fix', err);
      });
      await fixSavannaDryFormat().catch((err) => {
        logBackfillError('Savanna Dry format fix', err);
      });
      await splitBundledFlavourSkus().catch((err) => {
        logBackfillError('Bundled flavour split', err);
      });
      await removeNonexistentSkus().catch((err) => {
        logBackfillError('Nonexistent SKU removal', err);
      });
      await removeNonexistentFormats().catch((err) => {
        logBackfillError('Nonexistent format removal', err);
      });
      await renameMislabeledSkus().catch((err) => {
        logBackfillError('Mislabeled SKU rename', err);
      });
      await backfillBrandImages().catch((err) => {
        logBackfillError('Brand image backfill', err);
      });
      await backfillSpiritPricing().catch((err) => {
        logBackfillError('Spirit pricing backfill', err);
      });
      await backfillCeremonySkus().catch((err) => {
        logBackfillError('Ceremony SKU backfill', err);
      });
      await backfillCatalogueExpansion().catch((err) => {
        logBackfillError('Catalogue expansion SKU backfill', err);
      });
      await backfillGroceryBulkCatalog().catch((err) => {
        logBackfillError('Grocery bulk catalogue backfill', err);
      });
      await backfillClothingSkus().catch((err) => {
        logBackfillError('Clothing SKU backfill', err);
      });
      await backfillMoninSyrups().catch((err) => {
        logBackfillError('Monin syrup backfill', err);
      });
      await backfillQuartGaps().catch((err) => {
        logBackfillError('Quart gap backfill', err);
      });
      await backfillBulkUnits().catch((err) => {
        logBackfillError('Bulk unit backfill', err);
      });
      await backfillVerifiedRetailPrices().catch((err) => {
        logBackfillError('Verified retail price backfill', err);
      });
      await fixAboveRetailPricing().catch((err) => {
        logBackfillError('Above-retail pricing fix', err);
      });
      await backfillFounderSourcedSkus().catch((err) => {
        logBackfillError('Founder-sourced SKU backfill', err);
      });
      await backfillSedgwicks().catch((err) => {
        logBackfillError("Sedgwick's backfill", err);
      });
      await backfillExtractedBrandPhotos().catch((err) => {
        logBackfillError('Extracted brand photo backfill', err);
      });
      await backfillFormatSpecificPhotos().catch((err) => {
        logBackfillError('Format-specific photo backfill', err);
      });
      await clearBrokenBrandPhotos().catch((err) => {
        logBackfillError('Broken brand photo clear', err);
      });
    })();
  });