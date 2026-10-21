import prisma from '../config/db.js';
import { suggestedUnitCost, suggestedTotal, TRANSPORT_SUGGESTED_CAP } from '../../shared/ceremonyCosts.js';

// The money a host really paid for a priced provision lives in one extra
// column. The project has no migration history, so it is added lazily and
// idempotently (same approach as the stokvel tables).
async function createColumns() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "CeremonyCostItem" ADD COLUMN IF NOT EXISTS "actualCostZAR" DECIMAL(10,2);'
  );
  // Older ceremonies stored transport suggestions of R800-R1200. Bring any that
  // nobody has paid for yet down to the ceiling. Safe to repeat.
  await prisma.$executeRawUnsafe(
    `UPDATE "CeremonyCostItem" SET "unitCost" = ${Number(TRANSPORT_SUGGESTED_CAP)}
      WHERE "category" = 'transport' AND "unitCost" > ${Number(TRANSPORT_SUGGESTED_CAP)}
      AND "actualCostZAR" IS NULL AND "isPurchased" = false;`
  );
}

let columnsReady = null;
export function ensureCostColumns() {
  if (!columnsReady) columnsReady = createColumns().catch((err) => { columnsReady = null; throw err; });
  return columnsReady;
}

// All priced provisions for a ceremony, with the suggested and actual price
// side by side.
export async function loadCostRows(ceremonyId) {
  await ensureCostColumns();
  const rows = await prisma.$queryRaw`
    SELECT "id", "phase", "label", "category", "unit", "unitCost", "quantity", "isPurchased",
           "skuId", "suggestedAmount", "actualCostZAR"
    FROM "CeremonyCostItem" WHERE "ceremonyId" = ${ceremonyId} ORDER BY "createdAt" ASC, "id" ASC`;
  return rows.map((r) => {
    const base = { ...r, unitCost: Number(r.unitCost), quantity: Number(r.quantity) };
    return {
      id: r.id, phase: r.phase, label: r.label, category: r.category, unit: r.unit,
      quantity: base.quantity,
      suggestedUnitCost: suggestedUnitCost(base),
      suggestedTotal: suggestedTotal(base),
      // The stored unit price is kept so summaries can recompute the same way.
      unitCost: base.unitCost,
      isPurchased: Boolean(r.isPurchased),
      skuId: r.skuId || null,
      suggestedAmount: r.suggestedAmount || null,
      actualCostZAR: r.actualCostZAR === null || r.actualCostZAR === undefined ? null : Number(r.actualCostZAR),
    };
  });
}

// GET /:id/costs - everything the combined Checklist & Budget tab needs.
export const getCeremonyCosts = async (req, res) => {
  try {
    const { id } = req.params;
    const ceremony = await prisma.ceremony.findUnique({ where: { id }, select: { id: true, hostId: true, budgetZAR: true } });
    if (!ceremony) return res.status(404).json({ error: 'Ceremony not found' });
    if (ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

    const [costItems, checklistItems] = await Promise.all([
      loadCostRows(id),
      prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: id }, orderBy: { createdAt: 'asc' } }),
    ]);
    res.json({
      ceremonyId: id,
      budgetZAR: ceremony.budgetZAR === null ? null : Number(ceremony.budgetZAR),
      costItems,
      checklistItems,
    });
  } catch (error) {
    console.error('Get ceremony costs error:', error.message);
    res.status(500).json({ error: 'Could not load costs' });
  }
};

// PATCH /cost/:id/actual - record what was really paid for a provision.
// Entering a price also marks it bought; clearing it leaves the bought tick alone.
export const setCostActual = async (req, res) => {
  try {
    await ensureCostColumns();
    const { id } = req.params;
    const raw = req.body?.actualCostZAR;
    let value = null;
    if (raw !== null && raw !== undefined && raw !== '') {
      value = parseFloat(raw);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({ error: 'The amount paid must be zero or more' });
      }
      value = Math.round(value * 100) / 100;
    }

    const item = await prisma.ceremonyCostItem.findUnique({ where: { id }, include: { ceremony: { select: { hostId: true } } } });
    if (!item) return res.status(404).json({ error: 'Cost item not found' });
    if (item.ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

    if (value === null) {
      await prisma.$executeRaw`UPDATE "CeremonyCostItem" SET "actualCostZAR" = NULL, "updatedAt" = NOW() WHERE "id" = ${id}`;
    } else {
      await prisma.$executeRaw`
        UPDATE "CeremonyCostItem" SET "actualCostZAR" = ${value}, "isPurchased" = true, "updatedAt" = NOW() WHERE "id" = ${id}`;
    }
    res.json({ id, actualCostZAR: value });
  } catch (error) {
    console.error('Set cost actual error:', error.message);
    res.status(500).json({ error: 'Could not save the amount paid' });
  }
};
