import { listEntries, getBalances, verifyLedger, checkStokvelBalance } from '../services/ledgerService.js';
import { getStokvelRole } from '../utils/stokvelAccess.js';
import { fromCents } from '../utils/money.js';

// Read-only for now: every member can see the books. Writing to the ledger
// happens only through the money flows themselves (stage 2), never by hand.

async function memberGuard(req, res) {
  const role = await getStokvelRole(req.params.stokvelId, req.userId);
  if (!role.exists) { res.status(404).json({ error: 'Stokvel not found' }); return null; }
  if (!role.isMember) { res.status(403).json({ error: 'Not a member of this stokvel' }); return null; }
  return role;
}

export async function getLedger(req, res) {
  try {
    if (!(await memberGuard(req, res))) return;
    const { stokvelId } = req.params;
    const before = parseInt(req.query.before, 10);
    const limit = parseInt(req.query.limit, 10);
    const [entries, balances] = await Promise.all([
      listEntries(stokvelId, {
        before: Number.isInteger(before) && before > 0 ? before : undefined,
        limit: Number.isInteger(limit) ? limit : undefined,
      }),
      getBalances(stokvelId),
    ]);
    res.json({
      entries,
      balances: Object.fromEntries(Object.entries(balances).map(([account, cents]) => [account, { cents, amount: fromCents(cents) }])),
      nextBefore: entries.length ? entries[entries.length - 1].seq : null,
    });
  } catch (error) {
    console.error('Get ledger error:', error.message);
    res.status(500).json({ error: 'Could not load the books' });
  }
}

export async function verifyLedgerChain(req, res) {
  try {
    if (!(await memberGuard(req, res))) return;
    res.json(await verifyLedger(req.params.stokvelId));
  } catch (error) {
    console.error('Verify ledger error:', error.message);
    res.status(500).json({ error: 'Could not check the books' });
  }
}

// FIN-03: the books are the official record. This compares the stored group
// balance (what screens show) with the books' bank total. Read-only: a
// mismatch is reported, never "fixed" automatically.
export async function checkBalance(req, res) {
  try {
    if (!(await memberGuard(req, res))) return;
    res.json(await checkStokvelBalance(req.params.stokvelId));
  } catch (error) {
    console.error('Check balance error:', error.message);
    res.status(500).json({ error: 'Could not compare the balance with the books' });
  }
}
