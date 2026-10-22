import prisma from '../config/db.js';

// The stokvel statement: every money movement in a date range, oldest first,
// with a running total. Moved out of stokvelFinanceController so it can be
// changed safely on its own.

async function guard(req, res) {
  const { stokvelId } = req.params;
  const [stokvel, member, official] = await Promise.all([
    prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true } }),
    prisma.stokvelMember.findFirst({ where: { stokvelId, userId: req.userId } }),
    prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId: req.userId } }),
  ]);
  if (!stokvel) { res.status(404).json({ error: 'Stokvel not found' }); return false; }
  if (!member && !official && stokvel.organiserId !== req.userId) {
    res.status(403).json({ error: 'Not a member of this stokvel' });
    return false;
  }
  return true;
}

const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || null : null);

// Records point at people in two ways: contributions store the membership id
// (StokvelMember.id), while payouts, fines and loans store the person's user
// id. Looking everything up as a user id is why the statement showed
// "Member" instead of names. Resolve both kinds here.
async function resolveNames(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, firstName: true, lastName: true },
  });
  const names = Object.fromEntries(users.map((u) => [u.id, fullName(u)]));
  const missing = unique.filter((id) => !names[id]);
  if (missing.length) {
    const members = await prisma.stokvelMember.findMany({
      where: { id: { in: missing } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    });
    for (const m of members) names[m.id] = fullName(m.user);
  }
  return names;
}

export async function getStatement(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const { stokvelId } = req.params;
    const from = req.query.from ? new Date(`${req.query.from}T00:00:00.000Z`) : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999Z`) : new Date();
    if (isNaN(from) || isNaN(to)) return res.status(400).json({ error: 'Invalid date range' });

    // Raw-SQL tables may not exist yet in a brand-new stokvel, so missing
    // tables simply mean "nothing to show".
    const [contributions, payouts, fines, loans, repayments] = await Promise.all([
      prisma.contribution.findMany({ where: { stokvelId, status: 'CONFIRMED', createdAt: { gte: from, lte: to } }, take: 2000 }),
      prisma.payout.findMany({ where: { stokvelId, status: 'CLEARED', createdAt: { gte: from, lte: to } }, take: 2000 }),
      prisma.$queryRaw`SELECT "memberId", "amount", "fineType", "paidAt" FROM "StokvelFine"
        WHERE "stokvelId" = ${stokvelId} AND "paid" = true AND "paidAt" BETWEEN ${from} AND ${to}`.catch(() => []),
      prisma.$queryRaw`SELECT "borrowerId", "amount", "decidedAt" FROM "StokvelLoan"
        WHERE "stokvelId" = ${stokvelId} AND "status" IN ('APPROVED', 'REPAID') AND "decidedAt" BETWEEN ${from} AND ${to}`.catch(() => []),
      prisma.$queryRaw`SELECT r."amount", r."createdAt", l."borrowerId" FROM "StokvelLoanRepayment" r
        JOIN "StokvelLoan" l ON l."id" = r."loanId"
        WHERE r."stokvelId" = ${stokvelId} AND r."createdAt" BETWEEN ${from} AND ${to}`.catch(() => []),
    ]);

    const names = await resolveNames([
      ...contributions.map((c) => c.memberId), ...payouts.map((p) => p.recipientId),
      ...fines.map((f) => f.memberId), ...loans.map((l) => l.borrowerId), ...repayments.map((r) => r.borrowerId),
    ]);

    const entries = [
      ...contributions.map((c) => ({ date: c.createdAt, type: 'Contribution', who: names[c.memberId], amount: Number(c.amount) })),
      ...payouts.map((p) => ({ date: p.clearedAt || p.createdAt, type: 'Payout', who: names[p.recipientId], amount: -Number(p.amount) })),
      ...fines.map((f) => ({ date: f.paidAt, type: 'Fine paid', who: names[f.memberId], amount: Number(f.amount) })),
      ...loans.map((l) => ({ date: l.decidedAt, type: 'Loan issued', who: names[l.borrowerId], amount: -Number(l.amount) })),
      ...repayments.map((r) => ({ date: r.createdAt, type: 'Loan repayment', who: names[r.borrowerId], amount: Number(r.amount) })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 0;
    const withRunning = entries.map((e) => { running += e.amount; return { ...e, who: e.who || 'Member', running }; });
    const sumOf = (type) => entries.filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0);

    res.json({
      from: from.toISOString(), to: to.toISOString(), entries: withRunning,
      totals: {
        contributions: sumOf('Contribution'), payouts: sumOf('Payout'), fines: sumOf('Fine paid'),
        loansIssued: sumOf('Loan issued'), repayments: sumOf('Loan repayment'), net: running,
      },
    });
  } catch (error) {
    console.error('Statement error:', error.message);
    res.status(500).json({ error: 'Could not build statement' });
  }
}
