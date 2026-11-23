import prisma from '../config/db.js';

// Live examples (founder, 23 Nov 2026): a real stokvel and a real ceremony,
// built with the app's own steps, that every signed-in member can open and
// click through tab by tab. They are seen as one of the example's own people
// (the treasurer, the host), so every screen shows what it really shows.
// Nothing in them can be changed: any request that would change one is
// refused with a friendly message, before it reaches the screen's handler.
export const EXAMPLE_EMAIL_DOMAIN = 'examples.i-camagu.invalid';
export const EXAMPLE_REFUSAL = 'This is an example: look around as much as you like. Nothing here can be changed or saved.';

const registry = { ids: new Map(), list: { stokvels: [], ceremonies: [] } };

export async function loadExamples() {
  const users = await prisma.user.findMany({ where: { email: { endsWith: `@${EXAMPLE_EMAIL_DOMAIN}` } }, select: { id: true, firstName: true } });
  const userIds = users.map((u) => u.id);
  const ids = new Map();
  const list = { stokvels: [], ceremonies: [] };
  if (userIds.length) {
    const stokvels = await prisma.stokvel.findMany({
      where: { organiserId: { in: userIds }, NOT: { name: { endsWith: '(incomplete)' } } },
      select: { id: true, name: true, type: true, officials: { select: { userId: true, role: true, user: { select: { firstName: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    for (const s of stokvels) {
      const treasurer = s.officials.find((o) => o.role === 'TREASURER') || s.officials[0];
      if (!treasurer) continue;
      ids.set(s.id, treasurer.userId);
      list.stokvels.push({ id: s.id, name: s.name, type: s.type, seenAs: `${treasurer.user.firstName}, the ${treasurer.role === 'TREASURER' ? 'treasurer' : 'chairperson'}` });
    }
    const ceremonies = await prisma.ceremony.findMany({
      where: { hostId: { in: userIds } },
      select: { id: true, title: true, type: true, hostId: true, host: { select: { firstName: true } } },
    });
    const plans = await prisma.preparationPlan.findMany({ where: { hostId: { in: userIds } }, select: { id: true, ceremonyId: true, hostId: true } });
    for (const c of ceremonies) {
      ids.set(c.id, c.hostId);
      const plan = plans.find((p) => p.ceremonyId === c.id);
      if (plan) ids.set(plan.id, plan.hostId);
      list.ceremonies.push({ id: c.id, planId: plan?.id || null, title: c.title, type: c.type, seenAs: `${c.host.firstName}, the host` });
    }
  }
  registry.ids = ids;
  registry.list = list;
  return list;
}

export const exampleList = () => registry.list;
export const isExampleId = (id) => Boolean(id) && registry.ids.has(String(id));

// Mounted on /api before the routers. A GET that names an example (in its
// path) is answered as the example's own person; anything else that names an
// example (in its path or body) is refused.
export function exampleView(req, res, next) {
  if (!registry.ids.size) return next();
  const fromPath = req.path.split('/').find((part) => registry.ids.has(part));
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const fromBody = ['stokvelId', 'ceremonyId', 'planId'].map((k) => body[k]).find((v) => isExampleId(v));
  // A list (such as "my plans") can be asked for as an example: ?example=<id>.
  const fromQuery = req.method === 'GET' && isExampleId(req.query?.example) ? String(req.query.example) : null;
  const hit = fromPath || fromBody || fromQuery;
  if (!hit) return next();
  if (req.method === 'GET' && (fromPath || fromQuery)) {
    req.exampleActAs = registry.ids.get(fromPath || fromQuery);
    res.set('X-Icamagu-Example', '1');
    return next();
  }
  return res.status(403).json({ error: EXAMPLE_REFUSAL, example: true });
}
