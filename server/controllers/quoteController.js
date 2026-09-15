import prisma from '../config/db.js';
import { notifyEkoyiniOfQuoteRequest, confirmQuoteToClient } from '../services/notificationService.js';
import { isAdminEmail } from '../config/admin.js';

export async function submitQuoteRequest(req, res) {
      const body = req.body;

        if (!body.fullName || !body.surname || !body.clientEmail || !body.cellPhone || !body.eventType || !body.eventDate || !body.venueArea || !body.guestCount || !body.packageSelected) {
                return res.status(400).json({ error: 'Please fill in all required fields (marked with *)' });
        }

        // guestCount is required and non-nullable on the schema — a non-numeric
        // value here (truthy string, so it passes the check above) would reach
        // Prisma as NaN and fail with an unhandled 500 instead of a clean 400.
        const parsedGuestCount = parseInt(body.guestCount, 10);
        if (isNaN(parsedGuestCount) || parsedGuestCount <= 0) {
          return res.status(400).json({ error: 'guestCount must be a positive number' });
        }
        const parseOptionalInt = (value) => {
          if (value === undefined || value === null || value === '') return null;
          const parsed = parseInt(value, 10);
          return isNaN(parsed) ? null : parsed;
        };

          try {
                  const quote = await prisma.ekoyiniQuoteRequest.create({
                            data: {
                                        requestedById: req.userId,
                                                ceremonyId: body.ceremonyId || null,
                                                        fullName: body.fullName,
                                                                surname: body.surname,
                                                                        clientEmail: body.clientEmail,
                                                                                cellPhone: body.cellPhone,
                                                                                        whatsappNumber: body.whatsappNumber || null,
                                                                                                altContactName: body.altContactName || null,
                                                                                                        altContactNumber: body.altContactNumber || null,
                                                                                                                hearAboutUs: body.hearAboutUs || null,
                                                                                                                        referralName: body.referralName || null,
                                                                                                                                eventType: body.eventType,
                                                                                                                                        otherEventType: body.otherEventType || null,
                                                                                                                                                eventDate: new Date(body.eventDate),
                                                                                                                                                        eventStartTime: body.eventStartTime || null,
                                                                                                                                                                eventEndTime: body.eventEndTime || null,
                                                                                                                                                                        barServiceStart: body.barServiceStart || null,
                                                                                                                                                                                barServiceEnd: body.barServiceEnd || null,
                                                                                                                                                                                        setupAccessTime: body.setupAccessTime || null,
                                                                                                                                                                                                breakdownCompleteBy: body.breakdownCompleteBy || null,
                                                                                                                                                                                                        venueName: body.venueName || null,
                                                                                                                                                                                                                physicalAddress: body.physicalAddress || null,
                                                                                                                                                                                                                        venueArea: body.venueArea,
                                                                                                                                                                                                                                city: body.city || null,
                                                                                                                                                                                                                                        venueType: body.venueType || null,
                                                                                                                                                                                                                                                parkingAvailable: body.parkingAvailable || null,
                                                                                                                                                                                                                                                        parkingNote: body.parkingNote || null,
                                                                                                                                                                                                                                                                powerAccess: body.powerAccess || null,
                                                                                                                                                                                                                                                                        waterAccess: body.waterAccess || null,
                                                                                                                                                                                                                                                                                guestCount: parsedGuestCount,
                                                                                                                                                                                                                                                                                        ageRanges: body.ageRanges || null,
                                                                                                                                                                                                                                                                                                minorsPresent: !!body.minorsPresent,
                                                                                                                                                                                                                                                                                                        nonAlcoholicNeeded: !!body.nonAlcoholicNeeded,
                                                                                                                                                                                                                                                                                                                packageSelected: body.packageSelected,
                                                                                                                                                                                                                                                                                                                        customGuestCount: parseOptionalInt(body.customGuestCount),
                                                                                                                                                                                                                                                                                                                                customBudget: body.customBudget || null,
                                                                                                                                                                                                                                                                                                                                        addOns: body.addOns || null,
                                                                                                                                                                                                                                                                                                                                                additionalHookahPipes: parseOptionalInt(body.additionalHookahPipes),
                                                                                                                                                                                                                                                                                                                                                        otherRequests: body.otherRequests || null,
                                                                                                                                                                                                                                                                                                                                                                drinkMenuStyle: body.drinkMenuStyle || null,
                                                                                                                                                                                                                                                                                                                                                                        specificBrands: body.specificBrands || null,
                                                                                                                                                                                                                                                                                                                                                                                alcoholSupplier: body.alcoholSupplier || null,
                                                                                                                                                                                                                                                                                                                                                                                        budgetPerPerson: body.budgetPerPerson || null,
                                                                                                                                                                                                                                                                                                                                                                                                allergiesInfo: body.allergiesInfo || null,
                                                                                                                                                                                                                                                                                                                                                                                                        vipAreaNeeded: !!body.vipAreaNeeded,
                                                                                                                                                                                                                                                                                                                                                                                                                vipGuestCount: parseOptionalInt(body.vipGuestCount),
                                                                                                                                                                                                                                                                                                                                                                                                                        toastSpeechMoment: !!body.toastSpeechMoment,
                                                                                                                                                                                                                                                                                                                                                                                                                                dressCodeTheme: body.dressCodeTheme || null,
                                                                                                                                                                                                                                                                                                                                                                                                                                        culturalProtocols: body.culturalProtocols || null,
                                                                                                                                                                                                                                                                                                                                                                                                                                                setupRestrictions: body.setupRestrictions || null,
                                                                                                                                                                                                                                                                                                                                                                                                                                                        preferredPaymentMethod: body.preferredPaymentMethod || null,
                            },
                  });

                      await notifyEkoyiniOfQuoteRequest(quote);
                          await confirmQuoteToClient(quote);

                              res.status(201).json({ quote, message: 'Quote request sent! Ekoyini will be in touch shortly.' });
          } catch (error) {
                  console.error('Submit quote request error:', error.message);
                      res.status(500).json({ error: 'Could not submit quote request' });
          }
}

export async function getAllQuoteRequests(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !isAdminEmail(user.email)) return res.status(403).json({ error: 'Admin only' });

    const quotes = await prisma.ekoyiniQuoteRequest.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(quotes);
  } catch (error) {
    console.error('Get all quote requests error:', error.message);
    res.status(500).json({ error: 'Could not fetch quote requests' });
  }
}

export async function updateQuoteStatus(req, res) {
  const { quoteId, status } = req.body;
  const validStatuses = ['PENDING', 'QUOTED', 'CONFIRMED', 'DECLINED'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !isAdminEmail(user.email)) return res.status(403).json({ error: 'Admin only' });

    const quote = await prisma.ekoyiniQuoteRequest.update({ where: { id: quoteId }, data: { status } });
    res.json(quote);
  } catch (error) {
    console.error('Update quote status error:', error.message);
    res.status(500).json({ error: 'Could not update status' });
  }
}

export async function getMyQuoteRequests(req, res) {
      try {
              const quotes = await prisma.ekoyiniQuoteRequest.findMany({
                        where: { requestedById: req.userId },
                              orderBy: { createdAt: 'desc' },
              });
                  res.json(quotes);
      } catch (error) {
              console.error('Get quote requests error:', error.message);
                  res.status(500).json({ error: 'Could not fetch quote requests' });
      }
}