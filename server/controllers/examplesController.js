import CEREMONY_COST_PROFILES, { getDefaultItemsForType } from './ceremonyCostProfiles.js';
import { suggestedTotal } from '../../shared/ceremonyCosts.js';
import { groupRowsByPhase, phaseLabel } from '../../shared/ceremonyList.js';
import { seatingGroupsFor } from '../../shared/seating.js';
import { hirePlan } from '../../shared/hire.js';
import { drinksPoolExample } from '../../shared/examples.js';

// A fully prepared ulwaluko plan, from going in to umgidi, open to every
// member as an example (founder, 23 Nov 2026). Built from the same steps and
// guide prices a real plan starts with, for 150 guests, as it stands the
// day before umgidi: everything done except the closing and ubukrwala.
const GUESTS = 150;
const STILL_TO_DO = new Set(['CLOSURE', 'UBUKRWALA']);
// Example sizes for the seating groups at a 150-guest umgidi.
const GROUP_SIZES = [12, 6, 14, 6, 8, 16, 20, 18, 10, 10, 8, 12, 6, 4];

export function buildCeremonyExample() {
  const profile = CEREMONY_COST_PROFILES.ULWALUKO;
  const costs = [];
  for (const [phase, items] of Object.entries(profile)) {
    for (const item of items) {
      if (item.unit === 'warning') continue;
      const quantity = item.perGuestUnitFraction ? Math.max(1, Math.ceil(GUESTS * item.perGuestUnitFraction)) : item.quantity;
      costs.push({ phase, label: item.label, guide: suggestedTotal({ ...item, quantity }) });
    }
  }
  const costByLabel = new Map(costs.map((c) => [c.label, c]));
  const rows = getDefaultItemsForType('ULWALUKO').map((item, i) => ({
    key: `x${i}`,
    phase: item.phase,
    label: item.label,
    guide: costByLabel.get(item.label)?.guide || null,
    done: !STILL_TO_DO.has(item.phase),
  }));
  // Priced lines that are not also a step (e.g. ingredients).
  const stepLabels = new Set(rows.map((r) => r.label));
  for (const c of costs) {
    if (!stepLabels.has(c.label)) rows.push({ key: `c${rows.length}`, phase: c.phase, label: c.label, guide: c.guide, done: !STILL_TO_DO.has(c.phase) });
  }
  const stages = groupRowsByPhase(rows).map((g) => ({
    phase: g.phase,
    title: phaseLabel(g.phase),
    rows: g.rows.map(({ label, guide, done }) => ({ label, guide, done })),
    guide: Math.round(g.rows.reduce((s, r) => s + (r.guide || 0), 0) * 100) / 100,
  }));
  const hire = hirePlan(GUESTS);
  const drinks = drinksPoolExample();
  const planGuide = Math.round(stages.reduce((s, g) => s + g.guide, 0));
  const hireMid = Math.round((hire.usualLow + hire.usualHigh) / 2);
  const total = planGuide + hireMid + Math.round(drinks.basketPerMember);
  const steps = rows.length;
  const done = rows.filter((r) => r.done).length;
  return {
    title: 'Ulwaluko lukaLindani (example)',
    guests: GUESTS,
    goingIn: 'Sat, 6 December',
    umgidi: 'Sat, 3 January',
    budget: 120000,
    steps,
    done,
    stages,
    seating: seatingGroupsFor('ULWALUKO').map((g, i) => ({ ...g, size: GROUP_SIZES[i] || 6 })),
    hire,
    drinks: { basket: drinks.basket, total: drinks.basketPerMember, via: 'The family is one of the 50 members of the umgidi drinks stokvel' },
    money: { planGuide, hireMid, drinks: Math.round(drinks.basketPerMember), total },
  };
}

export async function getCeremonyExample(req, res) {
  try {
    res.json(buildCeremonyExample());
  } catch (error) {
    console.error('Ceremony example error:', error.message);
    res.status(500).json({ error: 'Could not load the example' });
  }
}
