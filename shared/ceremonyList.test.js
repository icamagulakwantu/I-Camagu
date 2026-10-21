import { describe, it, expect } from 'vitest';
import { buildListRows, summariseRows, groupRowsByPhase, countProgress } from './ceremonyList.js';

const transportCost = { id: 'c1', phase: 'TRANSPORT_ARRIVAL', label: 'Arrange transport to the mountain', category: 'transport', unit: 'trip', quantity: 1, unitCost: 1200, isPurchased: false, actualCostZAR: null };
const transportTask = { id: 't1', ceremonyId: 'x', phase: 'TRANSPORT_ARRIVAL', label: 'Arrange transport to the mountain', isCompleted: false, actualCostZAR: null };
const otherTask = { id: 't2', ceremonyId: 'x', phase: 'SPIRITUAL_ITEMS', label: 'Imphepho', isCompleted: false, actualCostZAR: null };

describe('buildListRows', () => {
  it('shows a task and a provision with the same name once', () => {
    const rows = buildListRows({ costItems: [transportCost], checklistItems: [transportTask, otherTask] });
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe('cost');
    expect(rows[0].task.id).toBe('t1');
    expect(rows[1].kind).toBe('task');
  });

  it('caps the transport guide price at the ceiling', () => {
    const [row] = buildListRows({ costItems: [transportCost] });
    expect(row.suggested).toBe(350);
  });

  it('marks a row done once a price is typed', () => {
    const [row] = buildListRows({ costItems: [{ ...transportCost, actualCostZAR: 200 }] });
    expect(row.done).toBe(true);
    expect(row.actual).toBe(200);
  });

  it('uses the price already typed on the merged task when the provision has none', () => {
    const [row] = buildListRows({ costItems: [transportCost], checklistItems: [{ ...transportTask, actualCostZAR: 180 }] });
    expect(row.actual).toBe(180);
  });

  it('turns warning items into notes with no price', () => {
    const [row] = buildListRows({ costItems: [{ id: 'w', phase: 'X', label: 'MALES ONLY', unit: 'warning', quantity: 0, unitCost: 0 }] });
    expect(row.kind).toBe('note');
  });
});

describe('summariseRows', () => {
  it('counts a merged price once', () => {
    const rows = buildListRows({
      costItems: [{ ...transportCost, actualCostZAR: 200 }],
      checklistItems: [{ ...transportTask, actualCostZAR: 200 }],
    });
    const s = summariseRows({ budgetZAR: 1000, rows });
    expect(s.spent).toBe(200);
    expect(s.remaining).toBe(800);
  });

  it('deducts nothing for suggested prices', () => {
    const rows = buildListRows({ costItems: [transportCost] });
    const s = summariseRows({ budgetZAR: 1000, rows });
    expect(s.spent).toBe(0);
    expect(s.stillToPay).toBe(350);
  });

  it('separates unexpected expenses from the list', () => {
    const rows = buildListRows({ costItems: [{ ...transportCost, actualCostZAR: 200 }] });
    const s = summariseRows({
      budgetZAR: 1000,
      rows,
      unforeseenItems: [{ id: 'u', phase: 'UNFORESEEN', label: 'Extra ice', actualCostZAR: 50 }],
    });
    expect(s.spent).toBe(250);
    expect(s.unforeseen).toBe(50);
    expect(s.onList).toBe(200);
  });

  it('ignores rough task estimates', () => {
    const rows = buildListRows({ checklistItems: [{ ...otherTask, targetCostZAR: 900 }] });
    const s = summariseRows({ budgetZAR: 1000, rows });
    expect(s.projected).toBe(0);
  });
});

describe('groupRowsByPhase and countProgress', () => {
  it('groups rows in the order phases first appear', () => {
    const rows = buildListRows({ costItems: [transportCost], checklistItems: [otherTask] });
    expect(groupRowsByPhase(rows).map((g) => g.phase)).toEqual(['TRANSPORT_ARRIVAL', 'SPIRITUAL_ITEMS']);
  });

  it('does not count notes in progress', () => {
    const rows = buildListRows({ costItems: [{ id: 'w', phase: 'X', label: 'NOTE', unit: 'warning', quantity: 0, unitCost: 0 }], checklistItems: [otherTask] });
    expect(countProgress(rows)).toEqual({ done: 0, total: 1 });
  });
});
