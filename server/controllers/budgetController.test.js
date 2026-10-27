import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = { preparationPlan: { findUnique: vi.fn() } };
vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('./ceremonyCostController.js', () => ({ loadCostRows: vi.fn() }));

const { loadCostRows } = await import('./ceremonyCostController.js');
const { getPlanBudget } = await import('./budgetController.js');

function responseRecorder() {
  return {
    statusCode: 200, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('getPlanBudget merged costs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts a checklist/provision pair with the same actual cost only once', async () => {
    prisma.preparationPlan.findUnique.mockResolvedValue({
      hostId: 'host-1',
      pledges: [],
      ceremony: {
        id: 'ceremony-1',
        budgetZAR: '1000.00',
        checklistItems: [{
          id: 'task-1', phase: 'LOGISTICS', label: 'Transport to the mountain',
          targetCostZAR: '250.00', actualCostZAR: '200.00', isCompleted: true,
        }],
      },
    });
    loadCostRows.mockResolvedValue([{
      id: 'cost-1', phase: 'LOGISTICS', label: 'Transport to the mountain',
      category: 'transport', unit: 'trip', quantity: 1, unitCost: 200,
      suggestedUnitCost: 200, suggestedTotal: 200, actualCostZAR: null, isPurchased: false,
    }]);

    const res = responseRecorder();
    await getPlanBudget({ params: { planId: 'plan-1' }, userId: 'host-1' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalActual).toBe(200);
    expect(res.body.remaining).toBe(800);
    expect(res.body.totalEstimated).toBe(200);
    expect(res.body.itemBreakdown).toHaveLength(1);
  });
});
