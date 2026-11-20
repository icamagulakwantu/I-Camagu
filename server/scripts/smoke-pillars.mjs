// End-to-end check of the main pillars against a running server and its
// database: ceremonies of every live type, lineage, stokvels, ukugida,
// directory and the bulk-buy catalogue. Run against a LOCAL server only:
//   SMOKE_BASE=http://localhost:3901 node server/scripts/smoke-pillars.mjs
// Creates throwaway users (smoke-*@example.invalid) in that local database
// and leaves them there; never point it at production.
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

const BASE = process.env.SMOKE_BASE || 'http://localhost:3901';
if (!/localhost|127\.0\.0\.1/.test(BASE)) { console.error('Refusing: smoke test is for a local server only.'); process.exit(1); }
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

const users = [];
async function makeUser(tag) {
  const u = await prisma.user.create({ data: {
    email: `smoke-${tag}-${Date.now()}@example.invalid`, firstName: 'Smoke', lastName: tag, passwordHash: 'x',
    username: `smoke_${tag}_${Date.now()}`.slice(0, 30), paternalIziduko: 'AmaCirha', maternalIziduko: 'AmaZizi',
  } });
  users.push(u.id);
  return { user: u, token: jwt.sign({ userId: u.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' }) };
}
const api = async (token, path, options = {}) => {
  const res = await fetch(BASE + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  let body = null; try { body = await res.json(); } catch { /* not json */ }
  return { status: res.status, body };
};

try {
  const { token } = await makeUser('a');

  const types = await api(token, '/api/ceremonies/types');
  const typeIds = (types.body || []).map((t) => t.id || t.type || t.value || t);
  check('ceremony types list', types.status === 200 && Array.isArray(types.body), `${typeIds.length} types`);

  for (const type of ['ULWALUKO', 'WEDDING', 'IMBELEKO', 'INTONJANE', 'UKUKHAPHA', 'UMGIDI']) {
    const r = await api(token, '/api/ceremonies/auto', { method: 'POST', body: JSON.stringify({ type, title: `Smoke ${type}`, eventDate: '2027-06-20', guestCount: 150, createPlan: true }) });
    const items = (r.body?.ceremony || r.body)?.checklistItems || [];
    check(`create ${type} plan`, r.status < 300 && !!r.body?.preparationPlan && items.length > 0, `${r.status}, ${items.length} items`);
    if (type === 'ULWALUKO') {
      const labels = items.map((i) => i.label).join(' | ');
      check('ulwaluko has registration, medical, ibhoma tools', /CoGTA/.test(labels) && /Medical examination/.test(labels) && /Ipeki and shovel/.test(labels));
    }
  }
  const plain = await api(token, '/api/ceremonies', { method: 'POST', body: JSON.stringify({ title: 'Smoke plain', type: 'WEDDING', eventDate: '2027-03-01' }) });
  check('create ceremony (plain route)', plain.status < 300, `${plain.status} ${plain.body?.error || ''}`);
  const notMine = await api(token, `/api/ceremonies/${plain.body?.id}`, { method: 'PUT', body: JSON.stringify({ savingStokvelId: 'not-my-stokvel' }) });
  check('cannot link a stokvel you do not belong to', notMine.status === 403, `${notMine.status}`);
  const plans = await api(token, '/api/ceremonies/plans/my');
  check('my plans lists them', plans.status === 200 && plans.body?.length >= 6, `${plans.body?.length}`);

  // The family link: anyone with it sees the plan, pledges and suggests.
  const planId = plans.body?.[0]?.id;
  const link = await api(token, `/api/ceremonies/plans/${planId}/share-link`, { method: 'POST' });
  const shareToken = link.body?.shareUrl?.split('/share/')[1];
  check('share link', link.status === 200 && !!shareToken);
  const pub = await api(null, `/api/public/plan/${shareToken}`);
  check('public plan view (no login)', pub.status === 200, `${pub.status}`);
  const pledge = await api(null, `/api/public/plan/${shareToken}/pledges`, { method: 'POST', body: JSON.stringify({ pledgerName: 'Malume Sipho', relationship: 'Uncle', pledgedAmountZAR: 500 }) });
  const pledges = await api(token, `/api/ceremonies/plans/${planId}/pledges`);
  check('family pledge reaches the host', pledge.status < 300 && JSON.stringify(pledges.body || '').includes('Malume Sipho'), `${pledge.status} ${pledge.body?.error || ''}`);
  const sugg = await api(null, `/api/public/plan/${shareToken}/suggestions`, { method: 'POST', body: JSON.stringify({ label: 'Imphepho', suggestedBy: 'Malume Sipho' }) });
  check('family suggestion', sugg.status < 300, `${sugg.status} ${sugg.body?.error || ''}`);
  const bad = await api(null, '/api/public/plan/not-a-real-token');
  check('a wrong link is refused', bad.status === 404, `${bad.status}`);

  const line = await api(token, '/api/iziduko/lineage', { method: 'PUT', body: JSON.stringify({ ancestors: [{ generation: 1, name: 'Sipho' }, { generation: 2, name: 'Mlungisi' }], shareForMatching: true }) });
  const lineBack = await api(token, '/api/iziduko/lineage');
  check('lineage save and read', line.status === 200 && lineBack.body?.ancestors?.length === 2 && lineBack.body.shareForMatching === true);

  const clans = await api(null, '/api/iziduko/public/clans?q=cirha');
  check('public clan search', clans.status === 200, JSON.stringify(clans.body).slice(0, 60));

  const st = await api(token, '/api/stokvels', { method: 'POST', body: JSON.stringify({ name: 'Smoke stokvel', type: 'CEREMONY_SAVINGS', contributionAmount: 200, contributionFrequency: 'MONTHLY' }) });
  const myStokvels = await api(token, '/api/stokvels/my');
  check('stokvel create and list', st.status < 300 && JSON.stringify(myStokvels.body || '').includes('Smoke stokvel'), `${st.status} ${st.body?.error || ''}`);

  const gift = await api(token, '/api/reciprocity/batch', { method: 'POST', body: JSON.stringify({ direction: 'RECEIVED', counterpartyName: 'Mam Nosipho', eventDate: '2026-11-21', items: [{ itemDescription: 'Klipdrift 750ml', quantity: 2 }] }) });
  const gifts = await api(token, '/api/reciprocity/my');
  check('ukugida record and list', gift.status < 300 && gifts.body?.length === 1, `${gift.status} ${gift.body?.error || ''}`);

  const vendors = await api(token, '/api/directory/vendors');
  check('directory vendors', vendors.status === 200 && Array.isArray(vendors.body));

  const catalogue = await api(null, '/api/basket/catalogue');
  check('bulk-buy catalogue', catalogue.status === 200 && Array.isArray(catalogue.body), `${catalogue.body?.length} products`);
} catch (err) {
  check('smoke run', false, err.message);
} finally {
  const ids = users;
  const ceremonies = await prisma.ceremony.findMany({ where: { hostId: { in: ids } }, select: { id: true } });
  console.log(`cleanup: ${ids.length} user(s), ${ceremonies.length} ceremonies left in the LOCAL test database`);
  await prisma.$disconnect();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
