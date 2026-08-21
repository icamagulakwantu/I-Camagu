import prisma from '../config/db.js';
import crypto from 'crypto';
import { CeremonyType } from '@prisma/client';
import { CEREMONY_COST_PROFILES, getDefaultItemsForType } from './ceremonyCostProfiles.js';

export const getCeremonyTypes = async (req, res) => {
      try {
              res.json(Object.values(CeremonyType));
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
              const { title, type, eventDate, notes } = req.body;
                  const hostId = req.user.id;

                      if (!title || !type || !hostId) {
                                return res.status(400).json({ error: 'Missing required fields' });
                      }

                          const ceremony = await prisma.ceremony.create({
                                    data: {
                                                title,
                                                        type,
                                                                eventDate: eventDate ? new Date(eventDate) : null,
                                                                        notes: notes || '',
                                                                                hostId,
                                                                                        status: 'PLANNING',
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
                  const ceremony = await prisma.ceremony.findUnique({ where: { id: ceremonyId } });

                      if (!ceremony) {
                                return res.status(404).json({ error: 'Ceremony not found' });
                      }

                          if (ceremony.hostId !== req.user.id) {
                                    return res.status(403).json({ error: 'Not your ceremony' });
                          }

                              await prisma.ceremony.delete({ where: { id: ceremonyId } });
                                  res.status(204).send();
      } catch (error) {
              console.error('Error deleting ceremony:', error);
                  res.status(500).json({ error: 'Internal server error' });
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

                      const item = await prisma.checklistItem.findUnique({
                                where: { id: itemId },
                                      include: { plan: true },
                      });

                          if (!item) return res.status(404).json({ error: 'Item not found' });
                              if (item.plan.hostId !== req.user.id) return res.status(403).json({ error: 'Not your plan' });

                                  const updated = await prisma.checklistItem.update({
                                            where: { id: itemId },
                                                  data: { actualCostZAR },
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

                      const plan = await prisma.preparationPlan.findUnique({ where: { id: planId } });

                          if (!plan) return res.status(404).json({ error: 'Plan not found' });
                              if (plan.hostId !== req.user.id) return res.status(403).json({ error: 'Not your plan' });

                                  const pledge = await prisma.contributionPledge.create({
                                            data: {
                                                        planId,
                                                                pledgerName,
                                                                        relationship: relationship || null,
                                                                                pledgedItem,
                                                                                        pledgedAmountZAR: pledgedAmountZAR || null,
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
      const { phase, label, isOptional } = req.body;
      if (!label) return res.status(400).json({ error: 'label is required' });

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
              const { title, type, eventDate, notes } = req.body;
                  const hostId = req.user.id;

                      if (!title || !type || !hostId) {
                                return res.status(400).json({ error: 'Missing required fields' });
                      }

                          const defaultItems = getDefaultItemsForType(type);
                              const costProfile = CEREMONY_COST_PROFILES[type];

                                  const ceremony = await prisma.$transaction(async (tx) => {
                                            const newCeremony = await tx.ceremony.create({
                                                        data: {
                                                                      title,
                                                                                type,
                                                                                          eventDate: eventDate ? new Date(eventDate) : null,
                                                                                                    notes: notes || '',
                                                                                                              hostId,
                                                                                                                        status: 'PLANNING',
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
                                                                    const costItems = [];
                                                                            for (const [phase, items] of Object.entries(costProfile)) {
                                                                                          for (const item of items) {
                                                                                                          costItems.push({
                                                                                                                            ceremonyId: newCeremony.id,
                                                                                                                                          phase,
                                                                                                                                                        label: item.label,
                                                                                                                                                                      category: item.category,
                                                                                                                                                                                    unit: item.unit,
                                                                                                                                                                                                  unitCost: item.unitCost,
                                                                                                                                                                                                                quantity: item.quantity,
                                                                                                                                                                                                                              isInputField: item.isInputField || false,
                                                                                                                                                                                                                                            inputType: item.inputType || 'number',
                                                                                                                                                                                                                                                          suggestedAmount: item.suggestedAmount || null,
                                                                                                          });
                                                                                          }
                                                                            }
                                                                                    if (costItems.length > 0) {
                                                                                                  await tx.ceremonyCostItem.createMany({ data: costItems });
                                                                                    }
                                                        }

                                                              return newCeremony;
                                  });

                                      const fullCeremony = await prisma.ceremony.findUnique({
                                                where: { id: ceremony.id },
                                                      include: {
                                                                  checklistItems: true,
                                                                          costItems: true,
                                                      },
                                      });

                                          res.status(201).json(fullCeremony);
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
                  const { title, eventDate, status, notes } = req.body;

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
                                                  },
                                  });
                                      res.json(updated);
      } catch (error) {
              console.error('Error updating ceremony:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};

// PATCH /checklist/:id - toggle checklist item (CeremonyChecklistItem)
export const updateChecklistItem = async (req, res) => {
      try {
              const { id } = req.params;
                  const { isCompleted } = req.body;

                      const item = await prisma.ceremonyChecklistItem.findUnique({
                                where: { id },
                                      include: { ceremony: true },
                      });

                          if (!item) return res.status(404).json({ error: 'Checklist item not found' });
                              if (item.ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

                                  const updated = await prisma.ceremonyChecklistItem.update({
                                            where: { id },
                                                  data: { isCompleted: !!isCompleted },
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
                  const { quantity, unitCost, isInputField, inputType, suggestedAmount } = req.body;

                      const item = await prisma.ceremonyCostItem.findUnique({
                                where: { id },
                                      include: { ceremony: true },
                      });

                          if (!item) return res.status(404).json({ error: 'Cost item not found' });
                              if (item.ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

                                  const updated = await prisma.ceremonyCostItem.update({
                                            where: { id },
                                                  data: {
                                                              quantity: quantity !== undefined ? quantity : undefined,
                                                                      unitCost: unitCost !== undefined ? unitCost : undefined,
                                                                              isInputField: isInputField !== undefined ? isInputField : undefined,
                                                                                      inputType: inputType || undefined,
                                                                                              suggestedAmount: suggestedAmount !== undefined ? suggestedAmount : undefined,
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
                                  select: { id: true, hostId: true },
                  });

                      if (!ceremony) return res.status(404).json({ error: 'Ceremony not found' });
                          if (ceremony.hostId !== req.user.id) return res.status(403).json({ error: 'Not your ceremony' });

                              const costItems = await prisma.ceremonyCostItem.findMany({
                                        where: { ceremonyId: id },
                              });

                                  let total = 0;
                                      const itemsWithTotal = costItems.map((item) => {
                                                const itemTotal = item.quantity * item.unitCost;
                                                      total += itemTotal;
                                                            return { ...item, itemTotal };
                                      });

                                          res.json({
                                                    ceremonyId: id,
                                                          items: itemsWithTotal,
                                                                total,
                                          });
      } catch (error) {
              console.error('Error calculating cost estimate:', error);
                  res.status(500).json({ error: 'Internal server error' });
      }
};
