import prisma from '../config/db.js';

// Saves an existing plan's structure as a reusable template — copies phases
// and labels only, never costs/pledges/checked-state, since those are
// specific to one real event, not the reusable structure.
export async function saveAsTemplate(req, res) {
      const { planId, templateTitle } = req.body;
        if (!planId || !templateTitle) return res.status(400).json({ error: 'planId and templateTitle are required' });

          try {
                  const source = await prisma.preparationPlan.findUnique({
                            where: { id: planId },
                                  include: {
                                    checklistItems: true,
                                    ceremony: { include: { checklistItems: true } },
                                  },
                  });
                      if (!source || source.hostId !== req.userId) return res.status(403).json({ error: 'Not your plan' });
                      const sourceItems = source.checklistItems?.length
                        ? source.checklistItems
                        : (source.ceremony?.checklistItems || []);

                          const template = await prisma.preparationPlan.create({
                                    data: {
                                                hostId: req.userId,
                                                        ceremonyType: source.ceremonyType,
                                                                title: templateTitle,
                                                                        isTemplate: true,
                                                                                clonedFromId: source.id,
                                    },
                          });

                              await prisma.checklistItem.createMany({
                                        data: sourceItems.map((item) => ({
                                                    planId: template.id,
                                                            phase: item.phase,
                                                                    label: item.label,
                                                                            targetCostZAR: item.targetCostZAR,
                                        })),
                              });

                                  const full = await prisma.preparationPlan.findUnique({ where: { id: template.id }, include: { checklistItems: true } });
                                      res.status(201).json(full);
          } catch (error) {
                  console.error('Save as template error:', error.message);
                      res.status(500).json({ error: 'Could not save template' });
          }
}

export async function getMyTemplates(req, res) {
      try {
              const templates = await prisma.preparationPlan.findMany({
                        where: { hostId: req.userId, isTemplate: true },
                              include: { checklistItems: true },
                                    orderBy: { createdAt: 'desc' },
              });
                  res.json(templates);
      } catch (error) {
              console.error('Get templates error:', error.message);
                  res.status(500).json({ error: 'Could not fetch templates' });
      }
}

// Starts a brand-new, real plan from a saved template — fresh isChecked/costs,
// optionally linked to a real Ceremony.
export async function useTemplate(req, res) {
      const { templateId, newTitle, ceremonyId } = req.body;
        if (!templateId || !newTitle) return res.status(400).json({ error: 'templateId and newTitle are required' });

          try {
                  const template = await prisma.preparationPlan.findUnique({
                            where: { id: templateId },
                                  include: { checklistItems: true },
                  });
                      if (!template || template.hostId !== req.userId) return res.status(403).json({ error: 'Not your template' });

                          const newPlan = await prisma.preparationPlan.create({
                                    data: {
                                                hostId: req.userId,
                                                        ceremonyType: template.ceremonyType,
                                                                title: newTitle,
                                                                        ceremonyId: ceremonyId || null,
                                                                                isTemplate: false,
                                                                                        clonedFromId: template.id,
                                    },
                          });

                              await prisma.checklistItem.createMany({
                                        data: template.checklistItems.map((item) => ({
                                                    planId: newPlan.id,
                                                            phase: item.phase,
                                                                    label: item.label,
                                                                            targetCostZAR: item.targetCostZAR,
                                        })),
                              });

                                  const full = await prisma.preparationPlan.findUnique({ where: { id: newPlan.id }, include: { checklistItems: true } });
                                      res.status(201).json(full);
          } catch (error) {
                  console.error('Use template error:', error.message);
                      res.status(500).json({ error: 'Could not create plan from template' });
          }
}