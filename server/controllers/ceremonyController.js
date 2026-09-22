import prisma from '../config/db.js';
import crypto from 'crypto';
import { CeremonyType } from '@prisma/client';
import { CEREMONY_COST_PROFILES, getDefaultItemsForType } from './ceremonyCostProfiles.js';

// UMSEBENZI_WENKOMO and IMIGIDI predate UMGIDI as the real user-facing type
// (UMGIDI is the correct standalone ceremony; IMIGIDI was a duplicate alias
// and UMSEBENZI_WENKOMO an old grouping that got broken apart into
// independent ceremony types — see CHANGES_DEEP_AUDIT.md). Kept in the enum
// because existing rows reference them, but never offered as a choice for a
// new ceremony. Filtered here, once, so every screen that lists ceremony
// types gets the same real list without needing to know this history.
const LEGACY_CEREMONY_TYPES = new Set(['UMSEBENZI_WENKOMO', 'IMIGIDI']);

export const getCeremonyTypes = async (req, res) => {
      try {
              res.json(Object.values(CeremonyType).filter((type) => !LEGACY_CEREMONY_TYPES.has(type)));
      } catch (error) {
              console.error('Error fetching ceremony types:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

export const getCeremonyTimeline = async (req, res) => {
      try {
            const { ceremonyType } = req.params;
            const normalized = ceremonyType.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
            const items = getDefaultItemsForType(normalized);

            const phaseMap = {};
            for (const item of items) {
                  if (!phaseMap[item.phase]) phaseMap[item.phase] = [];
                  phaseMap[item.phase].push(item.label);
            }

            let phases = Object.entries(phaseMap).map(([key, checklist]) => ({
                  key,
                  label: key.replace(/_/g, ' '),
                  checklist,
            }));

            if (normalized === 'ULWALUKO') {
                  const before = ['TRANSPORT_ARRIVAL', 'PHYSICAL_PREPARATION', 'SPIRITUAL_ITEMS', 'IBHOMA_CONSTRUCTION', 'DAILY_ESSENTIALS', 'DIET_EARLY_STAGE'];
                  const mountain = ['UMOJISO'];
                  const after = ['EXIT_PREPARATION', 'IBHOMA_CLOSURE', 'RETURN_HOME'];
                  const groups = [
                        ['BEFORE_MOUNTAIN', 'Before the mountain', before],
                        ['MOUNTAIN', 'Mountain phase', mountain],
                        ['AFTER_MOUNTAIN', 'After the mountain', after],
                  ];
                  phases = groups.map(([key, label, keys]) => ({
                        key,
                        label,
                        checklist: keys.flatMap(phase => phaseMap[phase] || []),
                  }));
            }

            res.json({ success: true, ceremonyType: normalized, phases });
      } catch (error) {
            console.error('Timeline error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to fetch ceremony timeline', error: error.message });
      }
};

// GET /my - list ceremonies for the authenticated user
export const getMyCeremonies = async (req, res) => {
      try {
              const hostId = req.user.id;
                  const ceremonies = await prisma.ceremony.findMany({
                            where: { hostId },
                                  orderBy: { eventDate: 'desc' },
                                        include: {
                                                    checklistItems: true,
                                                            costItems: true,
                                                                    preparationPlans: true,
                                                                            ceremonyGroups: true,
                                                                                    barBookings: true,
                                                                                            tourismPackage: true,
                                                                                                    ukusokaEntries: true,
                                        },
                  });
                      res.json(ceremonies);
      } catch (error) {
              console.error('Error fetching ceremonies:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// POST / - create a ceremony
export const createCeremony = async (req, res) => {
      try {
              const { title, type, eventDate, notes, budgetZAR } = req.body;
                  const hostId = req.user.id;

                      if (!title || !type || !hostId) {
                                return res.status(400).json({ error: 'Missing required fields' });
                      }

                      // updateCeremony validates budgetZAR (parse + non-negative); this
                      // creation path never got the same treatment, so a garbage or
                      // negative budget could be set at creation and only get caught
                      // later, if ever, on an edit.
                      let parsedBudget = null;
                      if (budgetZAR !== undefined && budgetZAR !== '' && budgetZAR !== null) {
                        parsedBudget = parseFloat(budgetZAR);
                        if (isNaN(parsedBudget) || parsedBudget < 0) {
                          return res.status(400).json({ error: 'budgetZAR must be a positive number' });
                        }
                      }

                          const ceremony = await prisma.ceremony.create({
                                    data: {
                                                title,
                                                        type,
                                                                eventDate: eventDate ? new Date(eventDate) : null,
                                                                        notes: notes || '',
                                                                                hostId,
                                                                                        status: 'PLANNING',
                                                                                                budgetZAR: parsedBudget,
                                    },
                          });
                              res.status(201).json(ceremony);
      } catch (error) {
              console.error('Error creating ceremony:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// DELETE /:ceremonyId - delete a ceremony
export const deleteCeremony = async (req, res) => {
  try {
    const { ceremonyId } = req.params;
    await prisma.$transaction(async (tx) => {
      const ceremony = await tx.ceremony.findUnique({
        where: { id: ceremonyId },
        include: { barBookings: { select: { id: true } }, tourismPackage: { include: { bookings: { select: { id: true } } } } }, },
      });
      if (!ceremony) { const error = new Error('Ceremony not found'); error.statusCode = 404; throw error; }
      if (ceremony.hostId !== req.user.id) { const error = new Error('Not your ceremony'); error.statusCode = 403; throw error; }
      const hasExternalBookings = ceremony.barBookings.length > 0 || (ceremony.tourismPackage?.bookings?.length || 0) > 0;
      if (hasExternalBookings) { const error = new Error('This ceremony has bookings and cannot be permanently deleted. Cancel or resolve those bookings first.'); error.statusCode = 409; throw error; }
      await tx.preparationPlan.deleteMany({ where: { ceremonyId } });
      await tx.ceremony.delete({ where: { id: ceremonyId } });
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting ceremony:', error.message);
    res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
  }
};

// ─── PREPARATION PLANS (existing separate model) ───────────────────────────


// POST /plans - create a preparation plan
export const createPreparationPlan = async (req, res) => {
      try {
              const { ceremonyId, title, items = [] } = req.body;
                  const hostId = req.user.id;

                      if (!ceremonyId || !title) {
                                return res.status(400).json({ error: 'ceremonyId and title are required' });
                      }

                          const ceremony = await prisma.ceremony.findUnique({ where: { id: ceremonyId } });

                              if (!ceremony) {
                                        return res.status(404).json({ error: 'Ceremony not found' });
                              }

                                  if (ceremony.hostId !== hostId) {
                                            return res.status(403).json({ error: 'Not your ceremony' });
                                  }

                                      const plan = await prisma.preparationPlan.create({
                                                data: {
                                                            title,
                                                                    hostId,
                                                                            ceremonyId,
                                                                                    ceremonyType: ceremony.type,
                                                                                            checklistItems: {
                                                                                                          create: Array.isArray(items)
                                                                                                                ? items.map(item => ({
                                                                                                                        phase: item.phase,
                                                                                                                        label: item.label,
                                                                                                                        targetCostZAR: item.targetCostZAR || null,
                                                                                                                  }))
                                                                                                                : [],
                                                                                            },
                                                },
                                                      include: { checklistItems: true, pledges: true },
                                      });
                                          res.status(201).json(plan);
      } catch (error) {
              console.error('Error creating preparation plan:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// GET /plans/my - get plans for the user

export const getMyPlans = async (req, res) => {
      try {
              const hostId = req.user.id;
                  const plans = await prisma.preparationPlan.findMany({
                            where: { hostId, isTemplate: false },
                                  include: {
                                        checklistItems: true,
                                        pledges: true,
                                        ceremony: { include: { checklistItems: true, costItems: true } },
                                  },
                                        orderBy: { createdAt: 'desc' },
                  });
                      res.json(plans);
      } catch (error) {
              console.error('Error fetching plans:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// DELETE /plans/:planId - delete a plan
export const deletePreparationPlan = async (req, res) => {
      try {
              const { planId } = req.params;
                  const plan = await prisma.preparationPlan.findUnique({ where: { id: planId } });

                      if (!plan) return res.status(404).json({ error: 'Plan not found' });
                          if (plan.hostId !== req.user.id) return res.status(403).json({ error: 'Not your plan' });

                              await prisma.preparationPlan.delete({ where: { id: planId } });
                                  res.status(204).send();
      } catch (error) {
              console.error('Error deleting plan:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// PATCH /plans/items/:itemId/toggle - toggle checklist item
export const toggleChecklistItem = async (req, res) => {
      try {
              const { itemId } = req.params;

                      const item = await prisma.checklistItem.findUnique({
                                where: { id: itemId },
                                      include: { plan: true },
                      });

                          if (!item) return res.status(404).json({ error: 'Item not found' });
                              if (item.plan.hostId !== req.user.id) return res.status(403).json({ error: 'Not your plan' });

                                  const updated = await prisma.checklistItem.update({
                                            where: { id: itemId },
                                                  data: { isChecked: !item.isChecked },
                                  });
                                      res.json(updated);
      } catch (error) {
              console.error('Error updating checklist item:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// PATCH /plans/items/:itemId/cost - update cost of checklist item
export const updateChecklistItemCost = async (req, res) => {
      try {
              const { itemId } = req.params;
                  const { actualCostZAR } = req.body;
                  // undefined (field omitted) leaves the cost untouched, matching
                  // Prisma's own semantics; '' or null explicitly clears it; anything
                  // else must be a real, non-negative number.
                  let costValue;
                  if (actualCostZAR === undefined) {
                    costValue = undefined;
                  } else if (actualCostZAR === '' || actualCostZAR === null) {
                    costValue = null;
                  } else {
                    costValue = parseFloat(actualCostZAR);
                    if (isNaN(costValue) || costValue < 0) {
                      return res.status(400).json({ error: 'actualCostZAR must be a positive number, or null to clear it' });
                    }
                  }

                      const item = await prisma.checklistItem.findUnique({
                                where: { id: itemId },
                                      include: { plan: true },
                      });

                          if (!item) return res.status(404).json({ error: 'Item not found' });
                              if (item.plan.hostId !== req.user.id) return res.status(403).json({ error: 'Not your plan' });

                                  const updated = await prisma.checklistItem.update({
                                            where: { id: itemId },
                                                  data: { actualCostZAR: costValue },
                                  });
                                      res.json(updated);
      } catch (error) {
              console.error('Error updating checklist item cost:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// POST /plans/pledges - add a pledge
export const addPledge = async (req, res) => {
      try {
              const { planId, pledgerName, relationship, pledgedItem, pledgedAmountZAR, linkedChecklistItemId } = req.body;

                  if (!planId || !pledgerName || !pledgedItem) {
                            return res.status(400).json({ error: 'planId, pledgerName, and pledgedItem are required' });
                  }

                  let parsedPledgeAmount = null;
                  if (pledgedAmountZAR !== undefined && pledgedAmountZAR !== '' && pledgedAmountZAR !== null) {
                    parsedPledgeAmount = parseFloat(pledgedAmountZAR);
                    if (isNaN(parsedPledgeAmount) || parsedPledgeAmount < 0) {
                      return res.status(400).json({ error: 'pledgedAmountZAR must be a positive number' });
                    }
                  }

                      const plan = await prisma.preparationPlan.findUnique({ where: { id: planId } });

                          if (!plan) return res.status(404).json({ error: 'Plan not found' });
                              if (plan.hostId !== req.user.id) return res.status(403).json({ error: 'Not your plan' });

                                  const pledge = await prisma.contributionPledge.create({
                                            data: {
                                                        planId,
                                                                pledgerName,
                                                                        relationship: relationship || null,
                                                                                pledgedItem,
                                                                                        pledgedAmountZAR: parsedPledgeAmount,
                                                                                                linkedChecklistItemId: linkedChecklistItemId || null,
                                                                                                        paidAmountZAR: 0,
                                            },
                                  });
                                      res.status(201).json(pledge);
      } catch (error) {
              console.error('Error adding pledge:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

export const addCeremonyChecklistItem = async (req, res) => {
      const { id } = req.params;
      const { phase, label, isOptional, actualCostZAR } = req.body;
      if (!label) return res.status(400).json({ error: 'label is required' });

      let costValue = null;
      if (actualCostZAR !== undefined && actualCostZAR !== '' && actualCostZAR !== null) {
        costValue = parseFloat(actualCostZAR);
        if (isNaN(costValue) || costValue < 0) {
          return res.status(400).json({ error: 'actualCostZAR must be a positive number, or omitted' });
        }
      }

      try {
            const ceremony = await prisma.ceremony.findUnique({ where: { id } });
            if (!ceremony) return res.status(404).json({ error: 'Ceremony not found' });
            if (ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

            const item = await prisma.ceremonyChecklistItem.create({
                  data: {
                        ceremonyId: id,
                        phase: phase || 'CUSTOM',
                        label: label.trim(),
                        isOptional: !!isOptional,
                        // Real cost, entered right when the item is added — never a
                        // hardcoded catalogue price, since plenty of real ceremony
                        // costs (a friend's bakkie, a borrowed tent) have no SKU.
                        actualCostZAR: costValue,
                  },
            });
            res.status(201).json(item);
      } catch (error) {
            console.error('Add ceremony checklist item error:', error.message);
            res.status(500).json({ error: 'Could not add checklist item' });
      }
};

export const toggleCeremonyChecklistItem = async (req, res) => {
      const { id } = req.params;
      try {
            const item = await prisma.ceremonyChecklistItem.findUnique({
                  where: { id },
                  include: { ceremony: true },
            });
            if (!item) return res.status(404).json({ error: 'Checklist item not found' });
            if (item.ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

            const updated = await prisma.ceremonyChecklistItem.update({
                  where: { id },
                  data: { isCompleted: !item.isCompleted },
            });
            res.json(updated);
      } catch (error) {
            console.error('Toggle ceremony checklist item error:', error.message);
            res.status(500).json({ error: 'Could not update checklist item' });
      }
};

export const getPlanPledges = async (req, res) => {
      const { planId } = req.params;
      try {
            const plan = await prisma.preparationPlan.findUnique({ where: { id: planId } });
            if (!plan || plan.hostId !== req.userId) return res.status(403).json({ error: 'Not your plan' });

            const pledges = await prisma.contributionPledge.findMany({
                  where: { planId },
                  orderBy: { createdAt: 'asc' },
            });
            res.json(pledges);
      } catch (error) {
            console.error('Get plan pledges error:', error.message);
            res.status(500).json({ error: 'Could not fetch pledges' });
      }
};

export const deletePledge = async (req, res) => {
      try {
              const { pledgeId } = req.params;

                  const pledge = await prisma.contributionPledge.findUnique({
                            where: { id: pledgeId },
                                  include: { plan: true },
                  });

                      if (!pledge) return res.status(404).json({ error: 'Pledge not found' });
                          if (pledge.plan.hostId !== req.user.id) return res.status(403).json({ error: 'Not your plan' });

                              await prisma.contributionPledge.delete({ where: { id: pledgeId } });
                                  res.json({ message: 'Pledge removed' });
      } catch (error) {
              console.error('Error deleting pledge:', error.message);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// ─── YOUR (IMPROVED) SHARE LINK FUNCTIONS ────────────────────────────────────


export const generateShareLink = async (req, res) => {
      const { planId } = req.params;
        try {
                const plan = await prisma.preparationPlan.findUnique({ where: { id: planId } });
                    if (!plan || plan.hostId !== req.user.id) return res.status(403).json({ error: 'Not your plan' });

                        const token = plan.shareToken || crypto.randomBytes(12).toString('hex');
                            if (!plan.shareToken) {
                                      await prisma.preparationPlan.update({ where: { id: planId }, data: { shareToken: token } });
                            }
                                res.json({ shareUrl: `${req.protocol}://${req.get('host')}/share/${token}` });
        } catch (error) {
                console.error('Generate share link error:', error.message);
                    res.status(500).json({ error: 'Could not generate share link' });
        }
};

export const getPublicPlan = async (req, res) => {
      const { token } = req.params;
        try {
                const plan = await prisma.preparationPlan.findUnique({
                          where: { shareToken: token },
                                include: {
                                            checklistItems: true,
                                                    pledges: true,
                                                            host: { select: { firstName: true, lastName: true } },
                                },
                });
                    if (!plan) return res.status(404).json({ error: 'This link is invalid or has expired' });
                        res.json(plan);
        } catch (error) {
                console.error('Get public plan error:', error.message);
                    res.status(500).json({ error: 'Could not load shared plan' });
        }
};

// ============================================================================
// NEW FUNCTIONS (auto‑generation, detail, update, estimate)
// ============================================================================

// POST /auto - create ceremony with auto‑generated checklist & cost items
export const createAutoCeremony = async (req, res) => {
      try {
              const { title, type, eventDate, notes, budgetZAR, guestCount, createPlan = false } = req.body;
                  const hostId = req.user.id;

                      if (!title || !type || !hostId) {
                                return res.status(400).json({ error: 'Missing required fields' });
                      }

                      // Same gap as createCeremony: this is the actual path the app's
                      // "Create New Plan" form uses, and it stored budgetZAR unvalidated.
                      let parsedBudget = null;
                      if (budgetZAR !== undefined && budgetZAR !== '' && budgetZAR !== null) {
                        parsedBudget = parseFloat(budgetZAR);
                        if (isNaN(parsedBudget) || parsedBudget < 0) {
                          return res.status(400).json({ error: 'budgetZAR must be a positive number' });
                        }
                      }

                          const defaultItems = getDefaultItemsForType(type);
                              const costProfile = CEREMONY_COST_PROFILES[type];
                              let parsedGuestCount = null;
                              if (guestCount !== undefined && guestCount !== '' && guestCount !== null) {
                                parsedGuestCount = parseInt(guestCount, 10);
                                if (isNaN(parsedGuestCount) || parsedGuestCount < 0) {
                                  return res.status(400).json({ error: 'guestCount must be a positive number' });
                                }
                              }

                                  const result = await prisma.$transaction(async (tx) => {
                                            const newCeremony = await tx.ceremony.create({
                                                        data: {
                                                                      title,
                                                                                type,
                                                                                          eventDate: eventDate ? new Date(eventDate) : null,
                                                                                                    notes: notes || '',
                                                                                                              hostId,
                                                                                                                        status: 'PLANNING',
                                                                                                                                  budgetZAR: parsedBudget,
                                                                                                                                  guestCount: parsedGuestCount,
                                                        },
                                            });

                                                  if (defaultItems && defaultItems.length > 0) {
                                                              await tx.ceremonyChecklistItem.createMany({
                                                                            data: defaultItems.map((item) => ({
                                                                                            ceremonyId: newCeremony.id,
                                                                                                        phase: item.phase,
                                                                                                                    label: item.label,
                                                                                                                                isCompleted: false,
                                                                            })),
                                                              });
                                                  }

                                                        if (costProfile) {
                                                                    const allProfileItems = Object.values(costProfile).flat();
                                                                            const skuNames = [...new Set(allProfileItems.filter(i => i.skuName).map(i => i.skuName))];
                                                                            const matchedSkus = skuNames.length > 0
                                                                                  ? await tx.sku.findMany({ where: { name: { in: skuNames } } })
                                                                                  : [];
                                                                            const skuIdByName = Object.fromEntries(matchedSkus.map(s => [s.name, s.id]));

                                                                            const costItems = [];
                                                                            for (const [phase, items] of Object.entries(costProfile)) {
                                                                                          for (const item of items) {
                                                                                                          // perGuestUnitFraction items (catering groceries): scale quantity
                                                                                          // to guest count when given, falling back to a 150-guest baseline
                                                                                          // (a typical Umgidi size) so estimates stay sensible either way.
                                                                                          const scaledQuantity = item.perGuestUnitFraction
                                                                                                ? Math.max(1, Math.ceil((parsedGuestCount || 150) * item.perGuestUnitFraction))
                                                                                                : item.quantity;
                                                                                          costItems.push({
                                                                                                                            ceremonyId: newCeremony.id,
                                                                                                                                          phase,
                                                                                                                                                        label: item.label,
                                                                                                                                                                      category: item.category,
                                                                                                                                                                                    unit: item.unit,
                                                                                                                                                                                                  unitCost: item.unitCost,
                                                                                                                                                                                                                quantity: scaledQuantity,
                                                                                                                                                                                                                              isInputField: item.isInputField || false,
                                                                                                                                                                                                                                            inputType: item.inputType || 'number',
                                                                                                                                                                                                                                                          suggestedAmount: item.suggestedAmount || null,
                                                                                                                                                                                                                                                          skuId: item.skuName ? (skuIdByName[item.skuName] || null) : null,
                                                                                                          });
                                                                                          }
                                                                            }
                                                                                    if (costItems.length > 0) {
                                                                                                  await tx.ceremonyCostItem.createMany({ data: costItems });
                                                                                    }
                                                        }

                                                              let preparationPlan = null;
    if (createPlan) {
      preparationPlan = await tx.preparationPlan.create({ data: { title, hostId, ceremonyId: newCeremony.id, ceremonyType: type } });
    }
    return { ceremony: newCeremony, preparationPlan };
  });
  const fullCeremony = await prisma.ceremony.findUnique({ where: { id: result.ceremony.id }, include: { checklistItems: true, costItems: true, preparationPlans: true } });
  res.status(201).json(createPlan ? { ...fullCeremony, preparationPlan: result.preparationPlan } : fullCeremony);
      } catch (error) {
              console.error('Error creating auto ceremony:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// GET /:id - get ceremony with checklist & cost items
export const getCeremonyById = async (req, res) => {
      try {
              const { id } = req.params;
                  const ceremony = await prisma.ceremony.findUnique({
                            where: { id },
                                  include: {
                                              checklistItems: true,
                                                      costItems: true,
                                                              preparationPlans: true,
                                                                      ceremonyGroups: true,
                                                                              barBookings: true,
                                                                                      tourismPackage: true,
                                                                                              ukusokaEntries: true,
                                  },
                  });
                      if (!ceremony) {
                                return res.status(404).json({ error: 'Ceremony not found' });
                      }

                          if (ceremony.hostId !== req.user.id) {
                                    return res.status(403).json({ error: 'Not your ceremony' });
                          }

                              res.json(ceremony);
      } catch (error) {
              console.error('Error fetching ceremony:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// PUT /:id - update ceremony metadata
export const updateCeremony = async (req, res) => {
      try {
              const { id } = req.params;
                  const { title, eventDate, status, notes, budgetZAR, guestCount } = req.body;

                      let parsedBudget;
                      if (budgetZAR === undefined) {
                        parsedBudget = undefined;
                      } else if (budgetZAR === '' || budgetZAR === null) {
                        parsedBudget = null;
                      } else {
                        parsedBudget = parseFloat(budgetZAR);
                        if (isNaN(parsedBudget) || parsedBudget < 0) {
                          return res.status(400).json({ error: 'budgetZAR must be a positive number, or null to clear it' });
                        }
                      }

                      const ceremony = await prisma.ceremony.findUnique({ where: { id } });

                          if (!ceremony) return res.status(404).json({ error: 'Ceremony not found' });
                              if (ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

                                  const updated = await prisma.ceremony.update({
                                            where: { id },
                                                  data: {
                                                              title: title || undefined,
                                                                      eventDate: eventDate ? new Date(eventDate) : undefined,
                                                                              status: status || undefined,
                                                                                      notes: notes !== undefined ? notes : undefined,
                                                                                              budgetZAR: parsedBudget,
                                                                                              guestCount: guestCount !== undefined ? (guestCount === '' || guestCount === null ? null : parseInt(guestCount, 10)) : undefined,
                                                  },
                                  });
                                      res.json(updated);
      } catch (error) {
              console.error('Error updating ceremony:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// PATCH /checklist/:id - partial update (CeremonyChecklistItem): isCompleted
// and/or actualCostZAR. Only touches fields actually present in the body —
// omitting isCompleted used to silently reset it to false on every call.
export const updateChecklistItem = async (req, res) => {
      try {
              const { id } = req.params;
                  const { isCompleted, actualCostZAR } = req.body;

                      const item = await prisma.ceremonyChecklistItem.findUnique({
                                where: { id },
                                      include: { ceremony: true },
                      });

                          if (!item) return res.status(404).json({ error: 'Checklist item not found' });
                              if (item.ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

                                  const data = {};
                                  if (isCompleted !== undefined) data.isCompleted = !!isCompleted;
                                  if (actualCostZAR !== undefined) {
                                        if (actualCostZAR === null || actualCostZAR === '') {
                                          data.actualCostZAR = null;
                                        } else {
                                          const parsedCost = parseFloat(actualCostZAR);
                                          if (isNaN(parsedCost) || parsedCost < 0) {
                                            return res.status(400).json({ error: 'actualCostZAR must be a positive number, or null to clear it' });
                                          }
                                          data.actualCostZAR = parsedCost;
                                        }
                                  }

                                  const updated = await prisma.ceremonyChecklistItem.update({
                                            where: { id },
                                                  data,
                                  });
                                      res.json(updated);
      } catch (error) {
              console.error('Error updating checklist item:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// PATCH /cost/:id - update a cost item (CeremonyCostItem)
export const updateCostItem = async (req, res) => {
      try {
              const { id } = req.params;
                  const { quantity, unitCost, isInputField, inputType, suggestedAmount, isPurchased } = req.body;

                      // Both are Float columns fed straight into itemTotal math
                      // (getCostEstimate multiplies them) — an unvalidated NaN or
                      // negative value here would corrupt every budget total downstream.
                      let parsedQuantity;
                      if (quantity !== undefined) {
                        parsedQuantity = parseFloat(quantity);
                        if (isNaN(parsedQuantity) || parsedQuantity < 0) {
                          return res.status(400).json({ error: 'quantity must be a positive number' });
                        }
                      }
                      let parsedUnitCost;
                      if (unitCost !== undefined) {
                        parsedUnitCost = parseFloat(unitCost);
                        if (isNaN(parsedUnitCost) || parsedUnitCost < 0) {
                          return res.status(400).json({ error: 'unitCost must be a positive number' });
                        }
                      }

                      const item = await prisma.ceremonyCostItem.findUnique({
                                where: { id },
                                      include: { ceremony: true },
                      });

                          if (!item) return res.status(404).json({ error: 'Cost item not found' });
                              if (item.ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

                                  const updated = await prisma.ceremonyCostItem.update({
                                            where: { id },
                                                  data: {
                                                              quantity: parsedQuantity,
                                                                      unitCost: parsedUnitCost,
                                                                              isInputField: isInputField !== undefined ? isInputField : undefined,
                                                                                      inputType: inputType || undefined,
                                                                                              suggestedAmount: suggestedAmount !== undefined ? suggestedAmount : undefined,
                                                                                                      isPurchased: isPurchased !== undefined ? !!isPurchased : undefined,
                                                  },
                                  });
                                      res.json(updated);
      } catch (error) {
              console.error('Error updating cost item:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// GET /:id/estimate - get total cost estimate from CeremonyCostItem
export const getCostEstimate = async (req, res) => {
      try {
              const { id } = req.params;
                  const ceremony = await prisma.ceremony.findUnique({
                            where: { id },
                                  select: { id: true, hostId: true, budgetZAR: true },
                  });

                      if (!ceremony) return res.status(404).json({ error: 'Ceremony not found' });
                          if (ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

                              const costItems = await prisma.ceremonyCostItem.findMany({
                                        where: { ceremonyId: id },
                              });

                                  let total = 0;
                                      let spent = 0;
                                      const itemsWithTotal = costItems.map((item) => {
                                                const itemTotal = item.quantity * item.unitCost;
                                                      total += itemTotal;
                                                            if (item.isPurchased) spent += itemTotal;
                                                            return { ...item, itemTotal };
                                      });

                                          const budgetZAR = ceremony.budgetZAR !== null ? parseFloat(ceremony.budgetZAR) : null;

                                          res.json({
                                                    ceremonyId: id,
                                                          items: itemsWithTotal,
                                                                total,
                                                                spent,
                                                                budgetZAR,
                                                                remaining: budgetZAR !== null ? budgetZAR - spent : null,
                                          });
      } catch (error) {
              console.error('Error calculating cost estimate:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};
