import prisma from '../config/db.js';
import { isAdminEmail } from '../config/admin.js';

// Cost price is commercially sensitive — it is what iCamagu pays a supplier,
// and it must never reach a member. Every route here checks admin first, and
// the public catalogue endpoint continues to select the whole Sku row WITHOUT
// this controller, so cost only ever leaves the server through these two
// functions.
async function requireAdmin(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  if (!user || !isAdminEmail(user.email)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

function marginFor(sku) {
  const price = parseFloat(sku.casePriceZAR);
  const cost = sku.costPriceZAR == null ? null : parseFloat(sku.costPriceZAR);
  const retail = sku.retailPriceZAR == null ? null : parseFloat(sku.retailPriceZAR);
  const units = sku.unitsPerCase || 1;

  // Margin is only real once a cost is recorded. A missing cost stays null
  // rather than being assumed — an invented margin is worse than none.
  const marginPerCase = cost == null ? null : price - cost;

  return {
    id: sku.id,
    name: sku.name,
    category: sku.category,
    bottleFormat: sku.bottleFormat,
    unitsPerCase: units,
    bulkUnit: sku.bulkUnit,
    casePriceZAR: price,
    costPriceZAR: cost,
    retailPriceZAR: retail,
    marginPerCase,
    marginPerUnit: marginPerCase == null ? null : marginPerCase / units,
    marginPercent: marginPerCase == null || !price ? null : (marginPerCase / price) * 100,
    // The two states worth shouting about on an admin screen.
    belowCost: marginPerCase != null && marginPerCase < 0,
    aboveRetail: retail != null && price > retail,
  };
}

export async function getCatalogueMargins(req, res) {
  try {
    if (!(await requireAdmin(req, res))) return;

    const skus = await prisma.sku.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    const rows = skus.map(marginFor);

    res.json({
      rows,
      summary: {
        total: rows.length,
        withCost: rows.filter((r) => r.costPriceZAR != null).length,
        belowCost: rows.filter((r) => r.belowCost).length,
        aboveRetail: rows.filter((r) => r.aboveRetail).length,
      },
    });
  } catch (error) {
    console.error('Get catalogue margins error:', error.message);
    res.status(500).json({ error: 'Could not fetch margins' });
  }
}

export async function setSkuCostPrice(req, res) {
  const { skuId } = req.params;
  const { costPriceZAR } = req.body;

  try {
    if (!(await requireAdmin(req, res))) return;

    // null explicitly clears a cost that was entered in error — better than
    // leaving a wrong number in place.
    let cost = null;
    if (costPriceZAR !== null && costPriceZAR !== '' && costPriceZAR !== undefined) {
      cost = parseFloat(costPriceZAR);
      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({ error: 'Cost price must be a positive number, or null to clear it' });
      }
    }

    const sku = await prisma.sku.findUnique({ where: { id: skuId } });
    if (!sku) return res.status(404).json({ error: 'Product not found' });

    const updated = await prisma.sku.update({
      where: { id: skuId },
      data: { costPriceZAR: cost },
    });

    const row = marginFor(updated);
    res.json({
      sku: row,
      // Surfaced, not blocked: the founder may knowingly sell a loss-leader.
      // But it should never happen silently.
      warning: row.belowCost
        ? `This product now sells for less than it costs. You lose R${Math.abs(row.marginPerCase).toFixed(2)} on every ${sku.bulkUnit}.`
        : null,
    });
  } catch (error) {
    console.error('Set SKU cost price error:', error.message);
    res.status(500).json({ error: 'Could not save cost price' });
  }
}
