import prisma from '../config/db.js';
import { notifyEkoyiniOfBooking } from '../services/notificationService.js';

const MAX_TOURISM_SHARE_PERCENT = 0.30; // founder direction: host share must not exceed 30%

export async function createBarBooking(req, res) {
  const { ceremonyId } = req.body;
  if (!ceremonyId) return res.status(400).json({ error: 'ceremonyId is required' });

  try {
    const ceremony = await prisma.ceremony.findUnique({ where: { id: ceremonyId } });
    if (!ceremony || ceremony.hostId !== req.userId) return res.status(403).json({ error: 'Not your ceremony' });

    const host = await prisma.user.findUnique({ where: { id: req.userId } });

    const booking = await prisma.barServiceBooking.create({
      data: { ceremonyId, hostId: req.userId, status: 'REQUESTED' },
    });

    await notifyEkoyiniOfBooking(booking, ceremony, host);

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create bar booking error:', error.message);
    res.status(500).json({ error: 'Could not create booking' });
  }
}

export async function addWristbandTier(req, res) {
      const { bookingId, colorLabel, entitlement, guestCount } = req.body;
        if (!bookingId || !colorLabel || !entitlement) {
                return res.status(400).json({ error: 'bookingId, colorLabel, and entitlement are required' });
        }

          let parsedGuestCount = null;
          if (guestCount !== undefined && guestCount !== null && guestCount !== '') {
            parsedGuestCount = parseInt(guestCount, 10);
            if (isNaN(parsedGuestCount) || parsedGuestCount < 0) {
              return res.status(400).json({ error: 'guestCount must be a positive number' });
            }
          }

          try {
                  const booking = await prisma.barServiceBooking.findUnique({ where: { id: bookingId } });
                  if (!booking || booking.hostId !== req.userId) return res.status(403).json({ error: 'Not your booking' });

                  const tier = await prisma.wristbandTier.create({
                            data: { bookingId, colorLabel, entitlement, guestCount: parsedGuestCount },
                  });
                      res.status(201).json(tier);
          } catch (error) {
                  console.error('Add wristband tier error:', error.message);
                      res.status(500).json({ error: 'Could not add tier' });
          }
}

export async function createTourismPackage(req, res) {
      const { ceremonyId, pricePerHeadZAR, hostShareZAR, maxGroupSize } = req.body;
        if (!ceremonyId || !pricePerHeadZAR || !hostShareZAR) {
                return res.status(400).json({ error: 'ceremonyId, pricePerHeadZAR, and hostShareZAR are required' });
        }

          const price = parseFloat(pricePerHeadZAR);
            const share = parseFloat(hostShareZAR);

              // NaN comparisons are always false, so `share > price * MAX...` was
              // silently skipped whenever either value failed to parse — letting a
              // garbage or negative price/share straight past the 30%-cap rule and
              // into the Decimal columns below.
              if (isNaN(price) || price < 0 || isNaN(share) || share < 0) {
                return res.status(400).json({ error: 'pricePerHeadZAR and hostShareZAR must be positive numbers' });
              }

              if (share > price * MAX_TOURISM_SHARE_PERCENT) {
                      return res.status(400).json({
                                error: `Host share cannot exceed ${MAX_TOURISM_SHARE_PERCENT * 100}% of the per-head price (max R${(price * MAX_TOURISM_SHARE_PERCENT).toFixed(2)})`,
                      });
              }

              let parsedMaxGroupSize = null;
              if (maxGroupSize !== undefined && maxGroupSize !== null && maxGroupSize !== '') {
                parsedMaxGroupSize = parseInt(maxGroupSize, 10);
                if (isNaN(parsedMaxGroupSize) || parsedMaxGroupSize <= 0) {
                  return res.status(400).json({ error: 'maxGroupSize must be a positive number' });
                }
              }

                try {
                        const ceremony = await prisma.ceremony.findUnique({ where: { id: ceremonyId } });
                            if (!ceremony || ceremony.hostId !== req.userId) return res.status(403).json({ error: 'Not your ceremony' });

                                const pkg = await prisma.tourismPackage.upsert({
                                          where: { ceremonyId },
                                                update: { pricePerHeadZAR: price, hostShareZAR: share, maxGroupSize: parsedMaxGroupSize },
                                                      create: {
                                                                  ceremonyId, hostId: req.userId, pricePerHeadZAR: price, hostShareZAR: share,
                                                                          maxGroupSize: parsedMaxGroupSize,
                                                                                  isEnabled: false, // strictly opt-in — host must separately enable
                                                      },
                                });
                                    res.status(201).json(pkg);
                } catch (error) {
                        console.error('Create tourism package error:', error.message);
                            res.status(500).json({ error: 'Could not create package' });
                }
}

export async function toggleTourismPackage(req, res) {
      const { ceremonyId, isEnabled } = req.body;
        try {
                const pkg = await prisma.tourismPackage.findUnique({ where: { ceremonyId } });
                    if (!pkg || pkg.hostId !== req.userId) return res.status(403).json({ error: 'Not your package' });

                        const updated = await prisma.tourismPackage.update({
                                  where: { ceremonyId },
                                        data: { isEnabled: !!isEnabled },
                        });
                            res.json(updated);
        } catch (error) {
                console.error('Toggle tourism package error:', error.message);
                    res.status(500).json({ error: 'Could not update package' });
        }
}

export async function getTourismPackage(req, res) {
  const { ceremonyId } = req.params;
  try {
    const pkg = await prisma.tourismPackage.findUnique({ where: { ceremonyId } });
    if (pkg && pkg.hostId !== req.userId) return res.status(403).json({ error: 'Not your package' });
    res.json(pkg);
  } catch (error) {
    console.error('Get tourism package error:', error.message);
    res.status(500).json({ error: 'Could not fetch package' });
  }
}

const VALID_BOOKING_STATUSES = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];

export async function logTourismBooking(req, res) {
  const { tourismPackageId, tourismCompanyName, groupSize, totalPaidZAR, status } = req.body;
  if (!tourismPackageId || !tourismCompanyName || !groupSize || totalPaidZAR === undefined) {
    return res.status(400).json({ error: 'tourismPackageId, tourismCompanyName, groupSize, and totalPaidZAR are required' });
  }
  const parsedGroupSize = parseInt(groupSize, 10);
  const parsedTotalPaid = parseFloat(totalPaidZAR);
  if (isNaN(parsedGroupSize) || parsedGroupSize <= 0 || isNaN(parsedTotalPaid) || parsedTotalPaid < 0) {
    return res.status(400).json({ error: 'groupSize and totalPaidZAR must be positive numbers' });
  }
  const resolvedStatus = status && VALID_BOOKING_STATUSES.includes(status) ? status : 'CONFIRMED';

  try {
    const pkg = await prisma.tourismPackage.findUnique({ where: { id: tourismPackageId } });
    if (!pkg || pkg.hostId !== req.userId) return res.status(403).json({ error: 'Not your package' });

    const booking = await prisma.tourismBooking.create({
      data: {
        tourismPackageId,
        tourismCompanyName,
        groupSize: parsedGroupSize,
        totalPaidZAR: parsedTotalPaid,
        status: resolvedStatus,
      },
    });
    res.status(201).json(booking);
  } catch (error) {
    console.error('Log tourism booking error:', error.message);
    res.status(500).json({ error: 'Could not log booking' });
  }
}

export async function getTourismBookings(req, res) {
  const { tourismPackageId } = req.params;
  try {
    const pkg = await prisma.tourismPackage.findUnique({ where: { id: tourismPackageId } });
    if (!pkg || pkg.hostId !== req.userId) return res.status(403).json({ error: 'Not your package' });

    const bookings = await prisma.tourismBooking.findMany({
      where: { tourismPackageId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (error) {
    console.error('Get tourism bookings error:', error.message);
    res.status(500).json({ error: 'Could not fetch bookings' });
  }
}

export async function getBarBooking(req, res) {
  const { ceremonyId } = req.params;
  try {
    const booking = await prisma.barServiceBooking.findFirst({
      where: { ceremonyId },
      include: { wristbandTiers: true },
    });
    if (booking && booking.hostId !== req.userId) return res.status(403).json({ error: 'Not your booking' });
    res.json(booking);
  } catch (error) {
    console.error('Get bar booking error:', error.message);
    res.status(500).json({ error: 'Could not fetch booking' });
  }
}

export async function removeWristbandTier(req, res) {
  const { tierId } = req.params;
  try {
    const tier = await prisma.wristbandTier.findUnique({
      where: { id: tierId },
      include: { booking: true },
    });
    if (!tier || tier.booking.hostId !== req.userId) return res.status(403).json({ error: 'Not your booking' });
    await prisma.wristbandTier.delete({ where: { id: tierId } });
    res.json({ message: 'Wristband tier removed' });
  } catch (error) {
    console.error('Remove wristband tier error:', error.message);
    res.status(500).json({ error: 'Could not remove tier' });
  }
}
