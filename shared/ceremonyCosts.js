// Pure cost maths for a ceremony, shared by the server (budget screen) and the
// app (Checklist & Budget tab) so the two can never disagree.
//
// Two kinds of price live side by side:
//   - SUGGESTED: a starting guess from the app (quantity x unit price). Never
//     deducted from the budget.
//   - ACTUAL: what the host really paid. Only actual amounts are deducted.

// Founder's figure: a transport leg for a ceremony never costs more than R350,
// but the stored suggestions were R800-R1200. Applied when reading, so older
// ceremonies are corrected too.
export const TRANSPORT_SUGGESTED_CAP = 350;

export const UNFORESEEN_PHASE = 'UNFORESEEN';

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function hasActual(item) {
  return item.actualCostZAR !== null && item.actualCostZAR !== undefined && item.actualCostZAR !== '';
}

export function suggestedUnitCost(item) {
  const unit = toNumber(item.unitCost);
  return item.category === 'transport' ? Math.min(unit, TRANSPORT_SUGGESTED_CAP) : unit;
}

export function suggestedTotal(item) {
  return round2(toNumber(item.quantity) * suggestedUnitCost(item));
}

// costItems: priced provisions. checklistItems: tasks, including anything the
// host added themselves (unforeseen items), which only carry what was paid.
export function summariseCosts({ budgetZAR = null, costItems = [], checklistItems = [] }) {
  const budget = budgetZAR === null || budgetZAR === undefined || budgetZAR === '' ? null : toNumber(budgetZAR);

  const paidOnProvisions = costItems.filter(hasActual).reduce((sum, i) => sum + toNumber(i.actualCostZAR), 0);
  const paidOnTasks = checklistItems.filter(hasActual).reduce((sum, i) => sum + toNumber(i.actualCostZAR), 0);
  const spent = round2(paidOnProvisions + paidOnTasks);

  // Provisions not yet paid for still count towards the projection, at the suggested price.
  const stillToPay = round2(costItems.filter((i) => !hasActual(i)).reduce((sum, i) => sum + suggestedTotal(i), 0));
  // Tasks with only a rough estimate and no payment yet.
  const estimatedTasks = round2(
    checklistItems.filter((i) => !hasActual(i)).reduce((sum, i) => sum + toNumber(i.targetCostZAR), 0),
  );
  const unforeseen = round2(
    checklistItems.filter((i) => i.phase === UNFORESEEN_PHASE && hasActual(i)).reduce((sum, i) => sum + toNumber(i.actualCostZAR), 0),
  );

  const projected = round2(spent + stillToPay + estimatedTasks);
  const remaining = budget === null ? null : round2(budget - spent);
  const projectedRemaining = budget === null ? null : round2(budget - projected);

  return {
    budgetZAR: budget,
    spent,
    remaining,
    overBudget: remaining !== null && remaining < 0,
    stillToPay,
    projected,
    projectedRemaining,
    projectedOverBudget: projectedRemaining !== null && projectedRemaining < 0,
    unforeseen,
    paidCount: costItems.filter(hasActual).length + checklistItems.filter(hasActual).length,
  };
}
