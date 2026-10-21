// One list for the whole ceremony. The server keeps two kinds of rows: priced
// provisions (CeremonyCostItem) and checklist tasks (CeremonyChecklistItem).
// A host sees them as ONE list. When a task and a provision carry the same
// name (for example "Arrange transport to the mountain") they are shown once,
// so the same thing is never priced twice.
//
// The money rules do not change: a SUGGESTED price is only a hint and is never
// deducted. Only the ACTUAL price a host types in comes off the budget.
import { hasActual, suggestedTotal, suggestedUnitCost, summariseCosts, UNFORESEEN_PHASE } from './ceremonyCosts.js';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const normaliseLabel = (label) => String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const isTaskDone = (task) => Boolean(task.isCompleted || task.isChecked);
export const isCostDone = (cost) => Boolean(cost.isPurchased) || hasActual(cost);

// Warnings such as "MALES ONLY" are stored as cost items with unit "warning".
const isNote = (cost) => cost.unit === 'warning';

export function buildListRows({ costItems = [], checklistItems = [] }) {
  const tasks = checklistItems.filter((i) => i.phase !== UNFORESEEN_PHASE);
  const claimed = new Set();

  const findTask = (cost) => {
    const key = normaliseLabel(cost.label);
    const same = tasks.filter((t) => !claimed.has(t.id) && normaliseLabel(t.label) === key);
    return same.find((t) => t.phase === cost.phase) || same[0] || null;
  };

  const rows = [];
  for (const cost of costItems) {
    if (isNote(cost)) {
      rows.push({ key: `note-${cost.id}`, kind: 'note', phase: cost.phase, label: cost.label, done: false, actual: null, suggested: null });
      continue;
    }
    const task = findTask(cost);
    if (task) claimed.add(task.id);
    let actual = null;
    if (hasActual(cost)) actual = Number(cost.actualCostZAR);
    else if (task && hasActual(task)) actual = Number(task.actualCostZAR);
    const suggested = suggestedTotal(cost);
    rows.push({
      key: `cost-${cost.id}`,
      kind: 'cost',
      phase: cost.phase,
      label: cost.label,
      cost,
      task,
      actual,
      suggested: suggested > 0 ? suggested : null,
      quantity: cost.quantity,
      unitPrice: suggestedUnitCost(cost),
      done: isCostDone(cost) || (task ? isTaskDone(task) : false) || actual !== null,
    });
  }

  for (const task of tasks) {
    if (claimed.has(task.id)) continue;
    const actual = hasActual(task) ? Number(task.actualCostZAR) : null;
    rows.push({
      key: `task-${task.id}`,
      kind: 'task',
      phase: task.phase,
      label: task.label,
      cost: null,
      task,
      actual,
      suggested: null,
      done: isTaskDone(task) || actual !== null,
    });
  }
  return rows;
}

export function groupRowsByPhase(rows) {
  const groups = [];
  const byPhase = new Map();
  for (const row of rows) {
    if (!byPhase.has(row.phase)) {
      const group = { phase: row.phase, rows: [] };
      byPhase.set(row.phase, group);
      groups.push(group);
    }
    byPhase.get(row.phase).rows.push(row);
  }
  return groups;
}

export function phaseLabel(phase) {
  if (!phase || phase === 'CUSTOM') return 'Added by you';
  const text = String(phase).replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function countProgress(rows) {
  const real = rows.filter((r) => r.kind !== 'note');
  return { done: real.filter((r) => r.done).length, total: real.length };
}

// Totals for the single money card. A task that was merged into a provision is
// counted once, at the price the host typed. Rough task estimates are left out
// on purpose: the card only shows real payments and the suggested price of
// what is still to buy.
export function summariseRows({ budgetZAR = null, rows = [], unforeseenItems = [] }) {
  const costItems = rows.filter((r) => r.kind === 'cost').map((r) => ({ ...r.cost, actualCostZAR: r.actual }));
  const taskItems = rows.filter((r) => r.kind === 'task').map((r) => ({ ...r.task, targetCostZAR: null }));
  const base = summariseCosts({ budgetZAR, costItems, checklistItems: [...taskItems, ...unforeseenItems] });
  return { ...base, onList: round2(base.spent - base.unforeseen) };
}
