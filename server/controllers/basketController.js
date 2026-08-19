import prisma from '../config/db.js';

async function getOrCreateDraftBasket(userId) {
      let basket = await prisma.basket.findFirst({ where: { userId, status: 'DRAFT' } });
        if (!basket) {
                basket = await prisma.basket.create({ data: { userId, status: 'DRAFT' } });
        }
          return basket;
}

export async function getMyBasket(req, res) {
      try {
              const basket = await getOrCreateDraftBasket(req.userId);
                  const items = await prisma.basketItem.findMany({
                            where: { basketId: basket.id },
                                  include: { sku: true },
                  });

                      const totalCases = items.reduce((sum, i) => sum + i.quantity, 0);
                          const totalZAR = items.reduce((sum, i) => sum + (i.quantity * parseFloat(i.sku.casePriceZAR)), 0);

                              res.json({ basket, items, totalCases, totalZAR });
      } catch (error) {
              console.error('Get basket error:', error.message);
                  res.status(500).json({ error: 'Could not fetch basket' });
      }
}

export async function addItem(req, res) {
      const { skuId, quantity } = req.body; // quantity = number of CASES, never single bottles

        if (!skuId || !quantity || quantity < 1) {
                return res.status(400).json({ error: 'skuId and a quantity of at least 1 case are required' });
        }

          try {
                  const sku = await prisma.sku.findUnique({ where: { id: skuId } });
                      if (!sku) return res.status(404).json({ error: 'SKU not found' });

                          const basket = await getOrCreateDraftBasket(req.userId);

                              const existing = await prisma.basketItem.findFirst({ where: { basketId: basket.id, skuId } });

                                  const item = existing
                                        ? await prisma.basketItem.update({
                                                      where: { id: existing.id },
                                                                data: { quantity: existing.quantity + parseInt(quantity) },
                                                                          include: { sku: true },
                                        })
                                              : await prisma.basketItem.create({
                                                            data: { basketId: basket.id, skuId, quantity: parseInt(quantity) },
                                                                      include: { sku: true },
                                              });

                                                  res.status(201).json({ item, message: `${item.quantity} case(s) of ${sku.name} in your basket.` });
          } catch (error) {
                  console.error('Add item error:', error.message);
                      res.status(500).json({ error: 'Could not add item' });
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

    await prisma.basketItem.delete({ where: { id: itemId } });

    // Section 6 rule: if this basket is PARKED in a shared pool, notify other
    // contributing members that the pool composition changed.
    if (item.basket.status === 'PARKED' && item.basket.poolId) {
      const { createNotification } = await import('../services/notificationDbService.js');
      const otherBaskets = await prisma.basket.findMany({
        where: { poolId: item.basket.poolId, userId: { not: req.userId } },
      });
      for (const b of otherBaskets) {
        await createNotification(
          b.userId, 'POOL_CHANGED',
          'Someone in your bulk order pool changed their basket — check the group total.',
          'store'
        );
      }
    }

    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error('Remove item error:', error.message);
    res.status(500).json({ error: 'Could not remove item' });
  }
}
