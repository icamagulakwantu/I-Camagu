import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { postEntry } from '../services/ledgerService.js';
import { toCents } from '../utils/money.js';
import { createNotification, notifyMany } from '../services/notificationDbService.js';
import { generateReferenceCode } from '../utils/memberReference.js';

// Two things in a stokvel now need a second person to agree:
//  1. Joining. Knowing a stokvel's code or link is no longer enough; an
//     official must accept the person (unless an official already invited them).
//  2. Group expenses. One official asks, a DIFFERENT official approves with
//     their PIN, and only then does money come off the balance.
// The tables are created the first time they are needed (same approach as
// the invitations table), so there is no manual database step.

let tablesReady = null;
function ensureTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StokvelJoinRequest" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "stokvelId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "decidedAt" TIMESTAMP(3),
          "decidedById" TEXT
        );
      `);
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "StokvelJoinRequest_one_pending" ON "StokvelJoinRequest" ("stokvelId", "userId") WHERE "status" = 'PENDING';`
      );
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "StokvelJoinRequest_stokvelId_status_idx" ON "StokvelJoinRequest" ("stokvelId", "status");'
      );
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StokvelExpenseRequest" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "stokvelId" TEXT NOT NULL,
          "requestedById" TEXT NOT NULL,
          "amountCents" INTEGER NOT NULL,
          "note" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "decidedAt" TIMESTAMP(3),
          "decidedById" TEXT
        );
      `);
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "StokvelExpenseRequest_stokvelId_status_idx" ON "StokvelExpenseRequest" ("stokvelId", "status");'
      );
    })().catch((err) => {
      tablesReady = null; // try again next request
      throw err;
    });
  }
  return tablesReady;
}

const MAX_EXPENSE_CENTS = 2_000_000_000; // fits the INTEGER column (R20 million)

function parseCents(raw) {
  try {
    const cents = toCents(String(raw));
    return cents > 0 ? cents : null;
  } catch {
    return null;
  }
}

const rand = (cents) => `R${(cents / 100).toFixed(2)}`;
const balanceCents = (ledger) => Math.round(parseFloat(ledger.totalBalance) * 100);

async function getOfficial(stokvelId, userId) {
  return prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId } });
}

async function officialIds(stokvelId) {
  const rows = await prisma.stokvelOfficial.findMany({ where: { stokvelId }, select: { userId: true } });
  return [...new Set(rows.map((r) => r.userId))];
}

async function displayName(userId) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return `${u?.firstName || 'Someone'} ${u?.lastName || ''}`.trim();
}

async function addMember(stokvelId, userId) {
  const existing = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
  if (existing) return existing;
  const [count, user] = await Promise.all([
    prisma.stokvelMember.count({ where: { stokvelId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }),
  ]);
  const referenceCode = await generateReferenceCode(user?.firstName, count + 1);
  return prisma.stokvelMember.create({ data: { stokvelId, userId, referenceCode } });
}

// If an official already invited this person, using the code or link counts
// as accepting that invitation, so they join straight away.
async function acceptPendingInvite(stokvelId, userId) {
  try {
    const closed = await prisma.$executeRaw`
      UPDATE "StokvelInvite" SET "status" = 'ACCEPTED', "respondedAt" = NOW()
      WHERE "stokvelId" = ${stokvelId} AND "invitedUserId" = ${userId} AND "status" = 'PENDING'`;
    return closed > 0;
  } catch {
    return false; // invitations table not created yet, so there is no invitation
  }
}

// ---------- Joining ----------

// POST /api/stokvels/join  { stokvelId }
export async function joinOrRequest(req, res) {
  const userId = req.userId;
  const stokvelId = String(req.body.stokvelId || '').trim();
  if (!stokvelId) return res.status(400).json({ error: 'stokvelId is required' });

  try {
    await ensureTables();
    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { id: true, name: true, organiserId: true } });
    if (!stokvel) return res.status(404).json({ error: 'No stokvel has this code. Check it with the organiser.' });

    const existing = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
    if (existing) return res.status(409).json({ error: 'You are already a member of this stokvel' });

    if (await acceptPendingInvite(stokvelId, userId)) {
      const membership = await addMember(stokvelId, userId);
      return res.status(201).json({
        membership,
        joined: true,
        message: `Joined ${stokvel.name}. Your reference code is ${membership.referenceCode}.`,
      });
    }

    const pending = await prisma.$queryRaw`
      SELECT 1 FROM "StokvelJoinRequest"
      WHERE "stokvelId" = ${stokvelId} AND "userId" = ${userId} AND "status" = 'PENDING' LIMIT 1`;
    if (pending.length) {
      return res.status(409).json({ requested: true, error: `You already asked to join ${stokvel.name}. An official will answer soon.` });
    }

    await prisma.$executeRaw`
      INSERT INTO "StokvelJoinRequest" ("id", "stokvelId", "userId")
      VALUES (${randomUUID()}, ${stokvelId}, ${userId})`;

    const name = await displayName(userId);
    const recipients = [...new Set([...(await officialIds(stokvelId)), stokvel.organiserId])];
    await notifyMany(
      recipients,
      'STOKVEL_JOIN_REQUEST',
      `${name} asked to join "${stokvel.name}". Open the stokvel's Members tab to accept or decline.`,
      'stokvels'
    ).catch((err) => console.error('Join request notification failed:', err.message));

    // 409 on purpose: the older join screen treats any success as "joined",
    // and this person has not joined yet. `requested` tells newer screens
    // this is good news, not a failure.
    return res.status(409).json({
      requested: true,
      error: `Request sent to ${stokvel.name}. An official must accept you first. You will get a notification.`,
    });
  } catch (error) {
    console.error('Join or request error:', error.message);
    res.status(500).json({ error: 'Could not send your request to join' });
  }
}

// ---------- What officials need to answer ----------

// GET /api/stokvels/:stokvelId/approvals
export async function listApprovals(req, res) {
  const { stokvelId } = req.params;
  try {
    await ensureTables();
    if (!(await getOfficial(stokvelId, req.userId))) {
      return res.status(403).json({ error: 'Only officials can see requests' });
    }

    const [joins, expenses, officials] = await Promise.all([
      prisma.$queryRaw`
        SELECT r."id", r."createdAt", u."firstName", u."lastName", u."username"
        FROM "StokvelJoinRequest" r JOIN "User" u ON u."id" = r."userId"
        WHERE r."stokvelId" = ${stokvelId} AND r."status" = 'PENDING'
        ORDER BY r."createdAt" ASC LIMIT 50`,
      prisma.$queryRaw`
        SELECT e."id", e."createdAt", e."amountCents", e."note", e."requestedById", u."firstName", u."lastName"
        FROM "StokvelExpenseRequest" e JOIN "User" u ON u."id" = e."requestedById"
        WHERE e."stokvelId" = ${stokvelId} AND e."status" = 'PENDING'
        ORDER BY e."createdAt" ASC LIMIT 50`,
      officialIds(stokvelId),
    ]);

    res.json({
      officialCount: officials.length,
      joinRequests: joins.map((r) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`.trim(),
        username: r.username,
        createdAt: r.createdAt,
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        amount: Number(e.amountCents) / 100,
        note: e.note,
        requestedBy: `${e.firstName} ${e.lastName}`.trim(),
        isMine: e.requestedById === req.userId,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error('List approvals error:', error.message);
    res.status(500).json({ error: 'Could not load requests' });
  }
}

// Used by the badge count on the bottom menu.
export async function countOpenRequests(stokvelIds, userId) {
  if (!stokvelIds.length) return 0;
  try {
    await ensureTables();
    const [joins] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM "StokvelJoinRequest"
      WHERE "stokvelId" = ANY(${stokvelIds}) AND "status" = 'PENDING'`;
    const [expenses] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM "StokvelExpenseRequest"
      WHERE "stokvelId" = ANY(${stokvelIds}) AND "status" = 'PENDING' AND "requestedById" <> ${userId}`;
    return Number(joins?.n || 0) + Number(expenses?.n || 0);
  } catch (error) {
    console.error('Count open requests error:', error.message);
    return 0;
  }
}

// POST /api/stokvels/:stokvelId/join-requests/:requestId  { approve: true|false }
export async function decideJoinRequest(req, res) {
  const { stokvelId, requestId } = req.params;
  const approve = req.body.approve === true;
  try {
    await ensureTables();
    if (!(await getOfficial(stokvelId, req.userId))) {
      return res.status(403).json({ error: 'Only officials can answer join requests' });
    }

    const rows = await prisma.$queryRaw`
      SELECT "userId" FROM "StokvelJoinRequest"
      WHERE "id" = ${requestId} AND "stokvelId" = ${stokvelId} AND "status" = 'PENDING' LIMIT 1`;
    const request = rows[0];
    if (!request) return res.status(404).json({ error: 'This request was already answered' });

    // Close it first, only if still open, so a double tap cannot add someone twice.
    const closed = await prisma.$executeRaw`
      UPDATE "StokvelJoinRequest"
      SET "status" = ${approve ? 'APPROVED' : 'DECLINED'}, "decidedAt" = NOW(), "decidedById" = ${req.userId}
      WHERE "id" = ${requestId} AND "status" = 'PENDING'`;
    if (closed === 0) return res.status(409).json({ error: 'This request was already answered' });

    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { name: true } });
    if (approve) await addMember(stokvelId, request.userId);

    await createNotification(
      request.userId,
      'STOKVEL_JOIN_ANSWER',
      approve
        ? `You were accepted into "${stokvel?.name}". Open Stokvels to see it.`
        : `Your request to join "${stokvel?.name}" was not accepted.`,
      'stokvels'
    ).catch((err) => console.error('Join answer notification failed:', err.message));

    res.json({ message: approve ? 'Accepted. They are now a member.' : 'Request declined.' });
  } catch (error) {
    console.error('Decide join request error:', error.message);
    res.status(500).json({ error: 'Could not save your answer' });
  }
}

// ---------- Group expenses (two officials) ----------

// POST /api/stokvels/expense/record  { stokvelId, amount, note }
// Asks for the expense. Nothing comes off the balance until another official approves.
export async function requestExpense(req, res) {
  const userId = req.userId;
  const { stokvelId, amount, note } = req.body;
  if (!stokvelId || !amount) return res.status(400).json({ error: 'stokvelId and amount are required' });

  const amountCents = parseCents(amount);
  if (!amountCents) return res.status(400).json({ error: 'Amount must be a positive number with at most 2 decimals' });
  if (amountCents > MAX_EXPENSE_CENTS) return res.status(400).json({ error: 'That amount is too large' });
  const reason = String(note || '').trim();
  // An expense with no reason is how money disappears. Always ask for one.
  if (!reason) return res.status(400).json({ error: 'Say what the money was spent on' });

  try {
    await ensureTables();
    if (!(await getOfficial(stokvelId, userId))) {
      return res.status(403).json({ error: 'Only stokvel officials can record a group expense' });
    }
    const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    if (!ledger) return res.status(409).json({ error: 'This stokvel has no group ledger yet — contact support' });
    if (balanceCents(ledger) < amountCents) return res.status(400).json({ error: 'Expense amount exceeds the group balance' });

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "StokvelExpenseRequest" ("id", "stokvelId", "requestedById", "amountCents", "note")
      VALUES (${id}, ${stokvelId}, ${userId}, ${amountCents}, ${reason.slice(0, 300)})`;

    const others = (await officialIds(stokvelId)).filter((o) => o !== userId);
    if (others.length) {
      const name = await displayName(userId);
      await notifyMany(
        others,
        'GROUP_EXPENSE_REQUEST',
        `${name} asked to pay ${rand(amountCents)} from the group money for: ${reason.slice(0, 120)}. Open the stokvel's Members tab to approve or decline.`,
        'stokvels'
      ).catch((err) => console.error('Expense request notification failed:', err.message));
    }

    res.status(201).json({
      requestId: id,
      pendingApproval: true,
      message: others.length
        ? 'Sent for approval. Another official must approve it before the money comes off the balance.'
        : 'Saved, but you are the only official. Add another official on the Members tab so they can approve it.',
    });
  } catch (error) {
    console.error('Request expense error:', error.message);
    res.status(500).json({ error: 'Could not record group expense' });
  }
}

// POST /api/stokvels/:stokvelId/expenses/:requestId/approve  { pin }
export async function approveExpense(req, res) {
  const { stokvelId, requestId } = req.params;
  const userId = req.userId;
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'Enter your security PIN to approve' });

  const { verifyPin } = await import('../services/pinService.js');
  const pinCheck = await verifyPin(userId, pin);
  if (!pinCheck.valid) {
    const message = pinCheck.reason === 'NO_PIN_SET'
      ? 'You need to set a security PIN first — go to More → Security PIN.'
      : 'Incorrect PIN';
    return res.status(401).json({ error: message });
  }

  try {
    await ensureTables();
    if (!(await getOfficial(stokvelId, userId))) {
      return res.status(403).json({ error: 'Only stokvel officials can approve expenses' });
    }

    const rows = await prisma.$queryRaw`
      SELECT "requestedById", "amountCents", "note" FROM "StokvelExpenseRequest"
      WHERE "id" = ${requestId} AND "stokvelId" = ${stokvelId} AND "status" = 'PENDING' LIMIT 1`;
    const request = rows[0];
    if (!request) return res.status(404).json({ error: 'This expense was already answered' });
    if (request.requestedById === userId) {
      return res.status(403).json({ error: 'You cannot approve an expense you asked for. Another official must approve it.' });
    }

    const amountCents = Number(request.amountCents);
    const amount = amountCents / 100;

    let outcome;
    try {
      outcome = await prisma.$transaction(async (tx) => {
        const claimed = await tx.$executeRaw`
          UPDATE "StokvelExpenseRequest"
          SET "status" = 'APPROVED', "decidedAt" = NOW(), "decidedById" = ${userId}
          WHERE "id" = ${requestId} AND "status" = 'PENDING'`;
        if (claimed === 0) return 'TAKEN';
        // Only take the money if the balance still covers it, in the same
        // statement, so two approvals at once cannot push it below zero.
        const paid = await tx.stokvelGroupLedger.updateMany({
          where: { stokvelId, totalBalance: { gte: amount } },
          data: { totalBalance: { decrement: amount }, groupExpenses: { increment: amount } },
        });
        if (paid.count === 0) throw new Error('INSUFFICIENT');
        return 'OK';
      });
    } catch (err) {
      if (err.message === 'INSUFFICIENT') {
        return res.status(400).json({ error: 'The group balance is now too low for this expense' });
      }
      throw err;
    }
    if (outcome === 'TAKEN') return res.status(409).json({ error: 'This expense was already answered' });

    let ledgerWarning = null;
    try {
      await postEntry({
        stokvelId,
        kind: 'EXPENSE',
        memo: `Expense: ${String(request.note).slice(0, 300)}`,
        lines: [{ account: 'EXPENSES', amountCents }, { account: 'BANK', amountCents: -amountCents }],
        idempotencyKey: `expense:${requestId}`,
        createdById: request.requestedById,
        approvedById: userId,
      });
    } catch (error) {
      console.error('LEDGER POST FAILED expense', requestId, error.message);
      ledgerWarning = 'The balance was updated but the books entry could not be saved. Tell your treasurer so it can be corrected.';
    }

    const members = await prisma.stokvelMember.findMany({ where: { stokvelId }, select: { userId: true } });
    await notifyMany(
      members.map((m) => m.userId),
      'GROUP_EXPENSE_RECORDED',
      `A group expense of ${rand(amountCents)} was approved by two officials: ${String(request.note).slice(0, 120)}.`,
      'stokvels'
    ).catch((err) => console.error('Expense notification failed:', err.message));

    res.json({ ledgerWarning, message: 'Approved. The expense has come off the group balance.' });
  } catch (error) {
    console.error('Approve expense error:', error.message);
    res.status(500).json({ error: 'Could not approve the expense' });
  }
}

// POST /api/stokvels/:stokvelId/expenses/:requestId/decline
// Any official can decline; the person who asked can use this to cancel.
export async function declineExpense(req, res) {
  const { stokvelId, requestId } = req.params;
  const userId = req.userId;
  try {
    await ensureTables();
    if (!(await getOfficial(stokvelId, userId))) {
      return res.status(403).json({ error: 'Only stokvel officials can answer expenses' });
    }
    const rows = await prisma.$queryRaw`
      SELECT "requestedById", "amountCents" FROM "StokvelExpenseRequest"
      WHERE "id" = ${requestId} AND "stokvelId" = ${stokvelId} AND "status" = 'PENDING' LIMIT 1`;
    const request = rows[0];
    if (!request) return res.status(404).json({ error: 'This expense was already answered' });

    const closed = await prisma.$executeRaw`
      UPDATE "StokvelExpenseRequest"
      SET "status" = 'DECLINED', "decidedAt" = NOW(), "decidedById" = ${userId}
      WHERE "id" = ${requestId} AND "status" = 'PENDING'`;
    if (closed === 0) return res.status(409).json({ error: 'This expense was already answered' });

    const ownRequest = request.requestedById === userId;
    if (!ownRequest) {
      await createNotification(
        request.requestedById,
        'GROUP_EXPENSE_DECLINED',
        `Your group expense of ${rand(Number(request.amountCents))} was declined by another official.`,
        'stokvels'
      ).catch((err) => console.error('Expense decline notification failed:', err.message));
    }

    res.json({ message: ownRequest ? 'Request cancelled.' : 'Expense declined. No money was taken.' });
  } catch (error) {
    console.error('Decline expense error:', error.message);
    res.status(500).json({ error: 'Could not save your answer' });
  }
}
