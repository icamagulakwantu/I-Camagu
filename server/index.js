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
import { checkRequiredEnvVars, envStatus } from './config/envCheck.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

checkRequiredEnvVars();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
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

// Serve the built frontend
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// budgetZAR/isPurchased are new columns the Prisma client's default SELECT
// now expects on every Ceremony/CeremonyCostItem query — must exist before
// the app accepts traffic, not just before the routes that use them.
function logBackfillError(label, err) {
  console.error(`${label} failed — name=${err?.name} code=${err?.code} message=${err?.message}`);
}

// The very first DB query of a freshly booted process reliably gets a
// spurious "authentication failed" PrismaClientInitializationError from
// Supabase's PgBouncer pooler on cold start — every boot-time DB call
// (schema check, all four backfills) failed with this identically, while
// ordinary requests made once the process is warm succeed fine. Retrying
// after a short delay works around it instead of losing the boot-time
// writes on every single deploy.
async function withRetry(fn, label, delaysMs = [3000, 8000]) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= delaysMs.length) throw err;
      logBackfillError(`${label} (attempt ${attempt + 1}, retrying)`, err);
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
    }
  }
}

withRetry(ensureCeremonyBudgetColumns, 'Ceremony budget schema check')
  .catch((err) => {
    logBackfillError('Ceremony budget schema check', err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`iCamagu server listening on port ${PORT}`);
    });

    // Idempotent — safe to run on every boot. Sequential, each with its
    // own retry, so one slow/failed step doesn't take the others down
    // with it.
    (async () => {
      await withRetry(backfillBrandImages, 'Brand image backfill').catch((err) => {
        logBackfillError('Brand image backfill', err);
      });
      await withRetry(backfillSpiritPricing, 'Spirit pricing backfill').catch((err) => {
        logBackfillError('Spirit pricing backfill', err);
      });
      await withRetry(backfillCeremonySkus, 'Ceremony SKU backfill').catch((err) => {
        logBackfillError('Ceremony SKU backfill', err);
      });
      await withRetry(backfillCatalogueExpansion, 'Catalogue expansion SKU backfill').catch((err) => {
        logBackfillError('Catalogue expansion SKU backfill', err);
      });
    })();
  });