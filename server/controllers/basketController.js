import prisma from '../config/db.js';
import { PUBLIC_SKU_SELECT, toPublicItem, isOrderable } from '../utils/skuVisibility.js';
import { parsePositiveIntegerQuantity } from '../utils/quantity.js';

// One open (DRAFT) basket per member. Two tabs/requests racing here could
// otherwise each create one; the partial unique index added in
// ensure-schema.js (Basket_one_draft_per_user) makes the second create fail
// with P2002, and we simply re-read the winner's basket.
async function getOrCreateDraftBasket(userId) {
  const existing = await prisma.basket.findFirst({
    where: { userId, status: 'DRAFT' },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;
  try {
    return await prisma.basket.create({ data: { userId, status: 'DRAFT' } });
  } catch (error) {
    if (error.code === 'P2002') {
      const winner = await prisma.basket.findFirst({
        where: { userId, status: 'DRAFT' },
        orderBy: { createdAt: 'asc' },
      });
      if (winner) return winner;
    }
    throw error;
  }
}

export async function getMyBasket(req, res) {
      try {
              const basket = await getOrCreateDraftBasket(req.userId);
                  const items = await prisma.basketItem.findMany({
                            where: { basketId: basket.id },
                                  include: { sku: { select: PUBLIC_SKU_SELECT } },
                  });

                      const totalCases = items.reduce((sum, i) => sum + i.quantity, 0);
                          const totalZAR = items.reduce((sum, i) => sum + (i.quantity * parseFloat(i.sku.casePriceZAR || 0)), 0);

                              res.json({ basket, items: items.map(toPublicItem), totalCases, totalZAR });
      } catch (error) {
              console.error('Get basket error:', error.message);
                  res.status(500).json({ error: 'Could not fetch basket' });
      }
}

export async function addItem(req, res) {
      const { skuId, quantity } = req.body; // quantity = number of CASES, never single bottles

        if (!skuId) {
                return res.status(400).json({ error: 'skuId and a whole-number quantity of at least 1 case are required' });
        }
        let numericQuantity;
        try {
                numericQuantity = parsePositiveIntegerQuantity(quantity);
        } catch {
                return res.status(400).json({ error: 'skuId and a whole-number quantity of at least 1 case are required' });
        }

          try {
                  const sku = await prisma.sku.findUnique({ where: { id: skuId } });
                      if (!sku) return res.status(404).json({ error: 'SKU not found' });
                          if (!isOrderable(sku)) return res.status(409).json({ error: `${sku.name} is in the catalogue but doesn't have a price yet — check back once it's been priced.` });

                          const basket = await getOrCreateDraftBasket(req.userId);

                              const item = await prisma.$transaction(async (tx) => {
                            // Serialize adds for this basket so simultaneous taps/tabs
                            // cannot read the same old quantity and overwrite each other.
                            await tx.$queryRaw`SELECT "id" FROM "Basket" WHERE "id" = ${basket.id} FOR UPDATE`;
                            const existing = await tx.basketItem.findFirst({ where: { basketId: basket.id, skuId } });
                            return existing
                              ? tx.basketItem.update({
                                  where: { id: existing.id },
                                  data: { quantity: { increment: numericQuantity } },
                                  include: { sku: { select: PUBLIC_SKU_SELECT } },
                                })
                              : tx.basketItem.create({
                                  data: { basketId: basket.id, skuId, quantity: numericQuantity },
                                  include: { sku: { select: PUBLIC_SKU_SELECT } },
                                });
                          });

                                                  res.status(201).json({ item, message: `${item.quantity} case(s) of ${sku.name} in your basket.` });
          } catch (error) {
                  console.error('Add item error:', error.message);
                      res.status(500).json({ error: 'Could not add item' });
          }
}


export async function updateItem(req, res) {
  const { itemId } = req.params;
  const { quantity } = req.body;
  let numericQuantity;
  try {
    numericQuantity = parsePositiveIntegerQuantity(quantity);
  } catch {
    return res.status(400).json({ error: 'Quantity must be a whole number of at least 1 case' });
  }

  try {
    const item = await prisma.basketItem.findFirst({
      where: { id: itemId, basket: { userId: req.userId, status: 'DRAFT' } },
      include: { sku: { select: PUBLIC_SKU_SELECT } },
    });
    if (!item) return res.status(404).json({ error: 'Item not found in your basket' });

    const updated = await prisma.basketItem.update({
      where: { id: itemId },
      data: { quantity: numericQuantity },
      include: { sku: { select: PUBLIC_SKU_SELECT } },
    });

    res.json({ item: toPublicItem(updated), message: `${updated.quantity} case(s) of ${item.sku.name} in your basket.` });
  } catch (error) {
    console.error('Update item error:', error.message);
    res.status(500).json({ error: 'Could not update item' });
  }
}

export async function removeItem(req, res) {
  const { itemId } = req.params;

  try {
    const item = await prisma.basketItem.findFirst({
      where: { id: itemId, basket: { userId: req.userId } },
      include: { basket: true },
    });
    if (!item) return res.status(404).json({ error: 'Item not found in your basket' });

    // Only an open (DRAFT) basket can shrink. Once a basket is committed to
    // a pool (PARKED) its amount is the member's pledge to the group, and
    // removing items would drop it below that committed amount; once
    // MATCHED/FULFILLED it is a real supplier order. A parked member who
    // needs out withdraws the whole basket (POST /pool/cancel-basket).
    if (item.basket.status === 'PARKED') {
      return res.status(409).json({
        error: 'This basket is already committed to a pool, so it can\'t go below the amount you pledged. Withdraw the basket instead if you need to change it.',
      });
    }
    if (item.basket.status !== 'DRAFT') {
      return res.status(409).json({ error: `This basket is ${item.basket.status.toLowerCase()} and can no longer be changed.` });
    }

    await prisma.basketItem.delete({ where: { id: itemId } });
    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error('Remove item error:', error.message);
    res.status(500).json({ error: 'Could not remove item' });
  }
}
