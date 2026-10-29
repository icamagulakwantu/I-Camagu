import prisma from '../config/db.js';

// A template is a PreparationPlan with isTemplate = true. Its ChecklistItem
// rows hold BOTH kinds of ceremony rows:
//   - checklist tasks   -> notes = {"templateKind":"task", ...}
//   - shopping/cost rows -> notes = {"templateKind":"cost", category, unit, ...}
// Storing the cost metadata as JSON in `notes` avoids a schema migration.
// Older templates have no notes JSON and are treated as plain tasks.
// Only the reusable structure is copied: never ticks, actual amounts or pledges.

const TASK = 'task';
const COST = 'cost';

function readMeta(item) {
  if (!item.notes) return { templateKind: TASK };
  try {
    const parsed = JSON.parse(item.notes);
    return parsed && parsed.templateKind ? parsed : { templateKind: TASK };
  } catch {
    return { templateKind: TASK };
  }
}

const toNumberOrNull = (value) => (value === null || value === undefined ? null : Number(value));

function taskToTemplateRow(templateId, item) {
  return {
    planId: templateId,
    phase: item.phase,
    label: item.label,
    targetCostZAR: item.targetCostZAR ?? null,
    notes: JSON.stringify({ templateKind: TASK, isOptional: Boolean(item.isOptional) }),
  };
}

function costToTemplateRow(templateId, cost) {
  return {
    planId: templateId,
    phase: cost.phase,
    label: cost.label,
    targetCostZAR: null,
    notes: JSON.stringify({
      templateKind: COST,
      category: cost.category,
      unit: cost.unit,
      unitCost: cost.unitCost,
      quantity: cost.quantity,
      isInputField: Boolean(cost.isInputField),
      inputType: cost.inputType ?? null,
      suggestedAmount: cost.suggestedAmount ?? null,
      skuId: cost.skuId ?? null,
    }),
  };
}

// Splits template rows back into ceremony checklist rows and ceremony cost rows.
function templateRowsToCeremonyRows(ceremonyId, rows) {
  const checklist = [];
  const costs = [];
  for (const row of rows) {
    const meta = readMeta(row);
    if (meta.templateKind === COST) {
      costs.push({
        ceremonyId,
        phase: row.phase,
        label: row.label,
        category: meta.category || 'other',
        unit: meta.unit || 'item',
        unitCost: Number(meta.unitCost) || 0,
        quantity: Number(meta.quantity) || 0,
        isPurchased: false,
        isInputField: Boolean(meta.isInputField),
        inputType: meta.inputType || null,
        suggestedAmount: meta.suggestedAmount || null,
        skuId: meta.skuId || null,
      });
    } else {
      checklist.push({
        ceremonyId,
        phase: row.phase,
        label: row.label,
        isOptional: Boolean(meta.isOptional),
        isCompleted: false,
        targetCostZAR: toNumberOrNull(row.targetCostZAR),
      });
    }
  }
  return { checklist, costs };
}

// Creates a real Ceremony with its checklist + shopping list, and the plan that
// the planner opens. Runs inside a transaction so nothing is half-created.
async function createCeremonyFromRows(tx, { hostId, ceremonyType, title, rows, existingPlanId }) {
  const ceremony = await tx.ceremony.create({
    data: { hostId, type: ceremonyType, title, status: 'PLANNING', visibility: 'PRIVATE', notes: '' },
  });
  const { checklist, costs } = templateRowsToCeremonyRows(ceremony.id, rows);
  if (checklist.length) await tx.ceremonyChecklistItem.createMany({ data: checklist });
  if (costs.length) {
    // skuId may point at a catalogue item that no longer exists; drop it rather than fail.
    const skuIds = [...new Set(costs.map((c) => c.skuId).filter(Boolean))];
    const existing = skuIds.length
      ? new Set((await tx.sku.findMany({ where: { id: { in: skuIds } }, select: { id: true } })).map((s) => s.id))
      : new Set();
    await tx.ceremonyCostItem.createMany({
      data: costs.map((c) => ({ ...c, skuId: c.skuId && existing.has(c.skuId) ? c.skuId : null })),
    });
  }
  return ceremony;
}

// Plans made from a template before this fix were created with ceremonyId = null,
// which crashed the planner. Give each one a real ceremony built from its rows.
async function repairOrphanTemplatePlans(hostId) {
  const orphans = await prisma.preparationPlan.findMany({
    where: { hostId, isTemplate: false, ceremonyId: null, clonedFromId: { not: null } },
    include: { checklistItems: true },
    take: 20,
  });
  for (const plan of orphans) {
    const template = await prisma.preparationPlan.findUnique({
      where: { id: plan.clonedFromId },
      include: { checklistItems: true },
    });
    // Prefer the template's rows (they include the shopping list); fall back to the plan's own.
    const rows = template?.checklistItems?.length ? template.checklistItems : plan.checklistItems;
    await prisma.$transaction(async (tx) => {
      const ceremony = await createCeremonyFromRows(tx, {
        hostId, ceremonyType: plan.ceremonyType, title: plan.title, rows,
      });
      await tx.preparationPlan.update({ where: { id: plan.id }, data: { ceremonyId: ceremony.id } });
    });
  }
}

// POST /templates/save — saves a plan's checklist AND shopping list as a template.
export async function saveAsTemplate(req, res) {
  const { planId, templateTitle } = req.body;
  if (!planId || !templateTitle) return res.status(400).json({ error: 'planId and templateTitle are required' });

  try {
    const source = await prisma.preparationPlan.findUnique({
      where: { id: planId },
      include: {
        checklistItems: true,
        ceremony: { include: { checklistItems: true, costItems: true } },
      },
    });
    if (!source || source.hostId !== req.userId) return res.status(403).json({ error: 'Not your plan' });

    const ceremonyTasks = source.ceremony?.checklistItems || [];
    const tasks = ceremonyTasks.length ? ceremonyTasks : (source.checklistItems || []);
    const costs = source.ceremony?.costItems || [];
    if (tasks.length === 0 && costs.length === 0) {
      return res.status(400).json({ error: 'This plan has no items to save yet' });
    }

    const full = await prisma.$transaction(async (tx) => {
      const template = await tx.preparationPlan.create({
        data: {
          hostId: req.userId,
          ceremonyType: source.ceremonyType,
          title: templateTitle,
          isTemplate: true,
          clonedFromId: source.id,
        },
      });
      await tx.checklistItem.createMany({
        data: [
          ...tasks.map((item) => taskToTemplateRow(template.id, item)),
          ...costs.map((cost) => costToTemplateRow(template.id, cost)),
        ],
      });
      return tx.preparationPlan.findUnique({ where: { id: template.id }, include: { checklistItems: true } });
    });

    res.status(201).json(withCounts(full));
  } catch (error) {
    console.error('Save as template error:', error.message);
    res.status(500).json({ error: 'Could not save template' });
  }
}

// Adds simple counts so the screen can say "12 checklist items, 30 shopping items".
function withCounts(template) {
  let taskCount = 0;
  let shoppingCount = 0;
  for (const item of template.checklistItems || []) {
    if (readMeta(item).templateKind === COST) shoppingCount += 1;
    else taskCount += 1;
  }
  return { ...template, taskCount, shoppingCount };
}

// GET /templates/my
export async function getMyTemplates(req, res) {
  try {
    try {
      await repairOrphanTemplatePlans(req.userId);
    } catch (repairError) {
      // Never block the list because a repair failed; log it and carry on.
      console.error('Template plan repair error:', repairError.message);
    }
    const templates = await prisma.preparationPlan.findMany({
      where: { hostId: req.userId, isTemplate: true },
      include: { checklistItems: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates.map(withCounts));
  } catch (error) {
    console.error('Get templates error:', error.message);
    res.status(500).json({ error: 'Could not fetch templates' });
  }
}

// POST /templates/use — starts a brand-new real ceremony from a template, with a
// fresh checklist and shopping list (nothing ticked, no amounts paid).
export async function useTemplate(req, res) {
  const { templateId, newTitle, eventDate } = req.body;
  const title = typeof newTitle === 'string' ? newTitle.trim() : '';
  if (!templateId || !title) return res.status(400).json({ error: 'templateId and newTitle are required' });

  try {
    const template = await prisma.preparationPlan.findUnique({
      where: { id: templateId },
      include: { checklistItems: true },
    });
    if (!template || template.hostId !== req.userId || !template.isTemplate) {
      return res.status(403).json({ error: 'Not your template' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ceremony = await createCeremonyFromRows(tx, {
        hostId: req.userId,
        ceremonyType: template.ceremonyType,
        title,
        rows: template.checklistItems,
      });
      if (eventDate) {
        const parsed = new Date(eventDate);
        if (!Number.isNaN(parsed.getTime())) {
          await tx.ceremony.update({ where: { id: ceremony.id }, data: { eventDate: parsed } });
        }
      }
      const preparationPlan = await tx.preparationPlan.create({
        data: {
          hostId: req.userId,
          ceremonyType: template.ceremonyType,
          title,
          ceremonyId: ceremony.id,
          isTemplate: false,
          clonedFromId: template.id,
        },
      });
      return { ceremony, preparationPlan };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Use template error:', error.message);
    res.status(500).json({ error: 'Could not create ceremony from template' });
  }
}
