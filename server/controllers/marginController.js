import prisma from '../config/db.js';
import { isAdminEmail } from '../config/admin.js';
import { RETAIL_SOURCES, RETAIL_VERIFIED } from '../utils/skuVisibility.js';

// Admin-only view of what we pay and what a shop charges.
//
// Cost price is what iCamagu pays a supplier and must never reach a member;
// every route here checks admin first. Member-facing endpoints go through
// PUBLIC_SKU_SELECT in utils/skuVisibility.js, which omits cost entirely, so
// it only ever leaves the server through this controller.
//
// This screen sees estimated retail prices as well as verified ones — an
// estimate is enough to notice we have priced something above the shop. The
// public side sees a retail price only when it has been verified.
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
  const price = sku.casePriceZAR == null ? null : parseFloat(sku.casePriceZAR);
  const cost = sku.costPriceZAR == null ? null : parseFloat(sku.costPriceZAR);
  const retail = sku.retailPriceZAR == null ? null : parseFloat(sku.retailPriceZAR);
  const units = sku.unitsPerCase || 1;

  // Margin is only real once both a price and a cost are recorded. Either
  // missing stays null rather than being assumed — an invented margin is
  // worse than none.
  const marginPerCase = cost == null || price == null ? null : price - cost;

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
    retailPriceSource: sku.retailPriceSource || null,
    retailPriceNote: sku.retailPriceNote || null,
    retailPriceCheckedAt: sku.retailPriceCheckedAt || null,
    marginPerCase,
    marginPerUnit: marginPerCase == null ? null : marginPerCase / units,
    marginPercent: marginPerCase == null || !price ? null : (marginPerCase / price) * 100,
    // The two states worth shouting about on an admin screen.
    belowCost: marginPerCase != null && marginPerCase < 0,
    // An estimate is enough to warn an admin that we look expensive — that
    // is exactly the kind of problem worth catching early. It is not enough
    // to tell a member they saved money, which is why the public catalogue
    // withholds an unverified price entirely.
    aboveRetail: retail != null && price > retail,
    aboveRetailVerified: retail != null && price > retail && sku.retailPriceSource === RETAIL_VERIFIED,
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
        retailVerified: rows.filter((r) => r.retailPriceSource === RETAIL_VERIFIED).length,
        retailEstimated: rows.filter((r) => r.retailPriceSource === 'ESTIMATE').length,
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

// Records what a shop charges, and — the point of this endpoint — where that
// number came from. A price with no stated source is refused: an unlabelled
// retail price is exactly what this whole mechanism exists to prevent.
export async function setSkuRetailPrice(req, res) {
  const { skuId } = req.params;
  const { retailPriceZAR, retailPriceSource, retailPriceNote } = req.body;

  try {
    if (!(await requireAdmin(req, res))) return;

    const sku = await prisma.sku.findUnique({ where: { id: skuId } });
    if (!sku) return res.status(404).json({ error: 'Product not found' });

    // Clearing the price clears its provenance with it, so a stale
    // "verified" can never outlive the number it described.
    if (retailPriceZAR === null || retailPriceZAR === '' || retailPriceZAR === undefined) {
      const cleared = await prisma.sku.update({
        where: { id: skuId },
        data: {
          retailPriceZAR: null, retailPriceSource: null,
          retailPriceCheckedAt: null, retailPriceNote: null,
        },
      });
      return res.json({ sku: marginFor(cleared), warning: null });
    }

    const price = parseFloat(retailPriceZAR);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Shop price must be a positive number, or null to clear it' });
    }
    if (!RETAIL_SOURCES.includes(retailPriceSource)) {
      return res.status(400).json({
        error: `Say where this price came from: ${RETAIL_SOURCES.join(' or ')}.`,
      });
    }
    if (retailPriceSource === RETAIL_VERIFIED && !String(retailPriceNote || '').trim()) {
      return res.status(400).json({
        error: 'A verified price needs a note saying which shop and when — that note is the evidence.',
      });
    }

    const updated = await prisma.sku.update({
      where: { id: skuId },
      data: {
        retailPriceZAR: price,
        retailPriceSource,
        retailPriceNote: String(retailPriceNote || '').trim() || null,
        retailPriceCheckedAt: new Date(),
      },
    });

    const row = marginFor(updated);
    res.json({
      sku: row,
      warning: row.aboveRetail
        ? `We charge R${(row.casePriceZAR - row.retailPriceZAR).toFixed(2)} more than the shop for this. Members who check will find that out.`
        : null,
    });
  } catch (error) {
    console.error('Set SKU retail price error:', error.message);
    res.status(500).json({ error: 'Could not save shop price' });
  }
}
