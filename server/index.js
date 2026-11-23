import 'dotenv/config';
import portalRoutes from './routes/portal.js';
import ukusokaRoutes from './routes/ukusoka.js';
import publicRoutes from './routes/public.js';
import stokvelRoutes from './routes/stokvel.js';
import legendRoutes from './routes/legend.js';
import hierarchyRoutes from './routes/hierarchy.js';
import exampleRoutes from './routes/examples.js';
import ekoyiniRoutes from './routes/ekoyini.js';
import expenditureRoutes from './routes/expenditure.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { readFile } from 'node:fs/promises';
import { getSharePreview, isPreviewCrawler, renderSharePreview } from './utils/sharePreview.js';
import { fileURLToPath } from 'url';
import prisma from './config/db.js';
import { ensureCeremonyBudgetColumns } from './scripts/ensure-schema.js';
import { ensureOfferSchema } from './services/offerService.js';
import { backfillHennessyProductImages } from './scripts/backfill-hennessy-product-images.js';
import { backfillRequestedProductImages } from './scripts/backfill-requested-product-images.js';
import { backfillUploadedProductImages } from './scripts/backfill-uploaded-product-images.js';
import { cleanUpCatalogueNov2026 } from './scripts/catalogue-cleanup-nov-2026.js';
import { fixUlwalukoDietWording } from './scripts/ulwaluko-diet-wording-nov-2026.js';
import { loadClanPraises } from './scripts/load-clan-praises.js';
import { updateUlwalukoPlans } from './scripts/ulwaluko-umgidi-nov-2026.js';
import { updateWeddingAndMourningPlans } from './scripts/wedding-mourning-nov-2026.js';
import { updateDirectoryListings, addMoreDirectoryListings, addHireListings, addTownshipHireListings } from './scripts/directory-listings-nov-2026.js';
import { addUlwalukoRegistrationSteps } from './scripts/ulwaluko-registration-nov-2026.js';
import { switchPapToSamp } from './scripts/samp-nov-2026.js';
import { applyGrocerySpecials } from './scripts/grocery-specials-nov-2026.js';
import { addEkoyiniProducts } from './scripts/ekoyini-catalogue-nov-2026.js';
import { correctQuartSizes } from './scripts/quart-sizes-nov-2026.js';
import { applyDrinksPhotosPrices, fixTsitsikammaSparklingPhoto } from './scripts/drinks-photos-prices-nov-2026.js';
import { applyPriceChecks } from './scripts/apply-price-checks.js';
import { addIbhomaItems } from './scripts/ibhoma-items-nov-2026.js';
import { mergeClanForms } from './scripts/merge-clan-forms-nov-2026.js';
import { alignCeremonyOrder } from './scripts/ceremony-order-nov-2026.js';
import { mergeCete } from './scripts/clan-cete-merge-nov-2026.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import izidukoRoutes from './routes/iziduko.js';
import reconciliationRoutes from './routes/reconciliation.js';
import notificationRoutes from './routes/notification.js';
import pushRoutes from './routes/push.js';
import { startPushSender } from './services/pushService.js';
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
import { storageStatus } from './services/storageService.js';
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
app.use('/api/push', pushRoutes);
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
    res.json({ status: 'ok', message: 'i-Camagu server running, database connected' });
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

// Whether family photo storage actually works (bucket reachable with our
// key) — yes/no plus a short reason code, never any secret.
app.get('/api/health/storage', async (req, res) => {
  res.json(await storageStatus());
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
app.use('/api/examples', exampleRoutes);
app.use('/api/ekoyini', ekoyiniRoutes);
app.use('/api/stokvels', stokvelRoutes);
app.use('/api/expenditure', expenditureRoutes);
app.use('/api/directory', directoryRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/messages', messageRoutes);

// WhatsApp/social crawlers receive route-specific, privacy-safe metadata.
// The response never looks up tokens or reads private ceremony/group records.
app.get(['/share/:token', '/pool/:id', '/join/stokvel/:id', '/join/clan/:code'], (req, res, next) => {
  const preview = getSharePreview(req.path);
  if (!preview || !isPreviewCrawler(req.get('user-agent'))) return next();

  readFile(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8')
    .then((html) => {
      const baseUrl = (process.env.APP_URL || 'https://i-camagu.co.za').replace(/\/+$/, '');
      const shareUrl = baseUrl + req.path;
      res.type('html').send(renderSharePreview(html, preview, shareUrl));
    })
    .catch(next);
});

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
  console.log(`i-Camagu server listening on port ${PORT}`);
});

try {
  // budgetZAR/isPurchased and friends are columns the Prisma client expects
  // on every query — they must exist before the app is reported healthy.
  await ensureCeremonyBudgetColumns();
  // Merchant offers on group orders (raw-SQL table, idempotent).
  await ensureOfferSchema();
  startup.schemaReady = true;
  console.log('Start-up database check passed.');
} catch (err) {
  startup.schemaError = err;
  console.error(`Start-up database check FAILED — name=${err?.name} code=${err?.code} message=${err?.message}`);
  captureException(err);
}

if (startup.schemaReady && process.env.NODE_ENV !== 'test') {
  // Phone notifications: send each new notification to the person's phones.
  startPushSender();
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
  // Fill only blank image URLs for the newly uploaded, locally hosted assets.
  // Existing catalogue images and all non-image SKU fields are preserved.
  try {
    await backfillUploadedProductImages();
  } catch (err) {
    console.error('Uploaded product image backfill failed:', err?.message);
  }
  // Founder's 12 Nov 2026 catalogue review: retire products not sold, fix
  // categories and pack names, remove images of the wrong pack, and price the
  // 300ml soft drinks and Black Label dumpy. Runs after the image scripts so
  // nothing above puts a wrong image back. Idempotent.
  try {
    await cleanUpCatalogueNov2026();
  } catch (err) {
    console.error('Catalogue clean-up (Nov 2026) failed:', err?.message);
  }
  // Founder's 17 Nov 2026 ulwaluko correction: no salt and nothing watery for
  // the first seven days, uMojiso after day 7. Idempotent.
  try {
    await fixUlwalukoDietWording();
  } catch (err) {
    console.error('Ulwaluko diet wording failed:', err?.message);
  }
  // Clan praise names (izinqulo) for the clan search. Idempotent.
  try {
    await loadClanPraises();
  } catch (err) {
    console.error('Clan praises failed:', err?.message);
  }
  // Founder's 19 Nov 2026 ulwaluko changes for existing plans. Runs once.
  try {
    await updateUlwalukoPlans();
  } catch (err) {
    console.error('Ulwaluko plan update failed:', err?.message);
  }
  // Full wedding plan and mourning steps for existing plans. Runs once.
  try {
    await updateWeddingAndMourningPlans();
  } catch (err) {
    console.error('Wedding and mourning plan update failed:', err?.message);
  }
  // Remove the sample practitioners and add the first local businesses. Runs once.
  try {
    await updateDirectoryListings();
    await addMoreDirectoryListings();
  } catch (err) {
    console.error('Directory listing update failed:', err?.message);
  }
  // CoGTA forms and the two medical examinations for upcoming ulwaluko plans. Runs once.
  try {
    await addUlwalukoRegistrationSteps();
  } catch (err) {
    console.error('Ulwaluko registration update failed:', err?.message);
  }
  // White samp, not pap, in existing plans (unticked, unpaid lines only). Runs once.
  try {
    await switchPapToSamp();
  } catch (err) {
    console.error('Samp update failed:', err?.message);
  }
  // Grocery bulk prices at retail specials, and new staples. Runs once.
  try {
    await applyGrocerySpecials();
  } catch (err) {
    console.error('Grocery specials update failed:', err?.message);
  }
  // Products from the Ekoyini catalogue, priced at online specials. Runs once.
  try {
    await addEkoyiniProducts();
  } catch (err) {
    console.error('Ekoyini catalogue import failed:', err?.message);
  }
  // Quart sizes: 660ml where shops sell 660ml; no Brutal Fruit quart. Runs once.
  try {
    await correctQuartSizes();
  } catch (err) {
    console.error('Quart size correction failed:', err?.message);
  }
  // Founder's drinks photos, new drinks, water prices checked online. Runs once.
  try {
    await applyDrinksPhotosPrices();
  } catch (err) {
    console.error('Drinks photos and prices failed:', err?.message);
  }
  try {
    await fixTsitsikammaSparklingPhoto();
  } catch (err) {
    console.error('Tsitsikamma photo fix failed:', err?.message);
  }
  // Weekly price checks (server/data/price-checks/*.json), each applied once.
  try {
    await applyPriceChecks();
  } catch (err) {
    console.error('Price checks failed:', err?.message);
  }
  // The fuller ibhoma list on upcoming ulwaluko plans. Runs once.
  try {
    await addIbhomaItems();
  } catch (err) {
    console.error('Ibhoma items failed:', err?.message);
  }
  // One clan, one entry: fold Tshawe into AmaTshawe and the like, then link
  // every member to their clan. Runs once.
  try {
    await mergeClanForms();
  } catch (err) {
    console.error('Clan forms merge failed:', err?.message);
  }
  // The founder's 23 Nov 2026 review: seating, journey order, wording. Once.
  try {
    await alignCeremonyOrder();
  } catch (err) {
    console.error('Ceremony order failed:', err?.message);
  }
  // AmaCethe and AmaCete are one clan (founder, 23 Nov 2026). Once.
  try {
    await mergeCete();
  } catch (err) {
    console.error('Clan Cete merge failed:', err?.message);
  }  // Hire companies for ceremonies at home (23 Nov 2026). Once.
  try {
    await addHireListings();
  } catch (err) {
    console.error('Hire listings failed:', err?.message);
  }
  try {
    await addTownshipHireListings();
  } catch (err) {
    console.error('Township hire listings failed:', err?.message);
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
