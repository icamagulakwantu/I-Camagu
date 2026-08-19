import prisma from '../config/db.js';
import crypto from 'crypto';
import { CEREMONY_COST_PROFILES, getDefaultItemsForType } from './ceremonyCostProfiles.js';

export const getCeremonyTimeline = async (req, res) => {
      try {
            const { ceremonyType } = req.params;
            const normalized = ceremonyType.toUpperCase().replace(/\s+/g, '_');
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

// ============================================================================
// NEW FUNCTIONS (auto‑generation, detail, update, estimate)
// ============================================================================

// POST /auto - create ceremony with auto‑generated checklist & cost items
export const createAutoCeremony = async (req, res) => {
      try {
              const { title, type, eventDate, notes } = req.body;
                  const hostId = req.user.id;

                      if (!title || !type || !eventDate || !hostId) {
                                return res.status(400).json({ error: 'Missing required fields' });
                      }

                          const defaultItems = getDefaultItemsForType(type);
                              const costProfile = CEREMONY_COST_PROFILES[type];

                                  const ceremony = await prisma.$transaction(async (tx) => {
                                            const newCeremony = await tx.ceremony.create({
                                                        data: {
                                                                      title,
                                                                                type,
                                                                                          eventDate: new Date(eventDate),
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
                                                                                                                                isOptional: !!item.isOptional,
                                                                                                                                isCompleted: false,
                                                                            })),
                                                              });
                                                  }

                                                  const defaultGroups = [
                                                        'Ootata', 'Isekela lika Tata', 'OoMama', 'Isekela lika Mama', 'Abayeni', 'Abafazi',
                                                        'Abafana belali', 'Iintombi zelali', 'Abafana bekhaya', 'Iintombi zekhaya',
                                                        'Indlu yeSbane', 'Young boys and girls', 'Personal friends', 'VIP guests',
                                                  ];
                                                  await tx.ceremonyGroup.createMany({
                                                        data: defaultGroups.map((groupLabel, index) => ({
                                                              ceremonyId: newCeremony.id,
                                                              groupLabel,
                                                              seatOrder: index + 1,
                                                        })),
                                                  });

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
                      if (ceremony.hostId !== req.userId) return res.status(403).json({ error: 'Not your ceremony' });
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
                      if (ceremony.hostId !== req.userId) return res.status(403).json({ error: 'Not your ceremony' });

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
              if (error.code === 'P2025') {
                        return res.status(404).json({ error: 'Ceremony not found' });
              }
                  console.error('Error updating ceremony:', error);
                      res.status(500).json({ error: 'Internal server error' });
      }
};

// PATCH /checklist/:id - toggle checklist item (CeremonyChecklistItem)
export const updateChecklistItem = async (req, res) => {
      try {
              const { id } = req.params;
                  const { isCompleted } = req.body;

                      const updated = await prisma.ceremonyChecklistItem.update({
                                where: { id },
                                      data: { isCompleted },
                      });
                          res.json(updated);
      } catch (error) {
              if (error.code === 'P2025') {
                        return res.status(404).json({ error: 'Checklist item not found' });
              }
                  console.error('Error updating checklist item:', error);
                      res.status(500).json({ error: 'Internal server error' });
      }
};

// PATCH /cost/:id - update a cost item (CeremonyCostItem)
export const updateCostItem = async (req, res) => {
      try {
              const { id } = req.params;
                  const { quantity, unitCost, isInputField, inputType, suggestedAmount } = req.body;

                      const updated = await prisma.ceremonyCostItem.update({
                                where: { id },
                                      data: {
                                                  quantity: quantity !== undefined ? quantity : undefined,
                                                          unitCost: unitCost !== undefined ? unitCost : undefined,
                                                                  isInputField: isInputField !== undefined ? isInputField : undefined,
                                                                          inputType: inputType || undefined,
                                                                                  suggestedAmount: suggestedAmount || undefined,
                                      },
                      });
                          res.json(updated);
      } catch (error) {
              if (error.code === 'P2025') {
                        return res.status(404).json({ error: 'Cost item not found' });
              }
                  console.error('Error updating cost item:', error);
                      res.status(500).json({ error: 'Internal server error' });
      }
};

// GET /:id/estimate - get total cost estimate from CeremonyCostItem
export const getCostEstimate = async (req, res) => {
      try {
              const { id } = req.params;
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
                                                                    
