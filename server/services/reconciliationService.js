// server/services/reconciliationService.js
// iCamagu — Three-Layer Reconciliation Engine
// RawBankLog → StokvelGroupLedger → Member Contribution
// Culture before capital.

import prisma from '../config/db.js';
import { postEntry } from './ledgerService.js';
import { toCents } from '../utils/money.js';

const STK_REF_REGEX = /STK-([A-Z]{3})-(\d{3})/;

// Parse a reference code from bank narration
export function extractReferenceCode(narration) {
  if (!narration) return null;
  const match = narration.match(STK_REF_REGEX);
  return match ? match[0] : null;
}

// Puts a bank-matched contribution on the tamper-evident books. The bank
// entry itself is the second check (money really arrived), so automatic
// matches have no human approver; manual matches record the official.
// A failure here never undoes the match: it is logged and returned as a
// warning, and repeating is safe because the key is the bank entry id.
async function postBankContribution({ rawLog, member, approvedById = null }) {
  try {
    const cents = toCents(String(rawLog.amount));
    if (cents <= 0) throw new Error('Bank entry has no positive amount');
    await postEntry({
      stokvelId: rawLog.stokvelId,
      kind: 'CONTRIBUTION',
      memo: approvedById ? 'Bank deposit assigned to member by an official' : 'Bank deposit matched by reference code',
      lines: [{ account: 'BANK', amountCents: cents }, { account: 'CONTRIBUTIONS', amountCents: -cents }],
      idempotencyKey: `bank:${rawLog.id}`,
      createdById: member.userId,
      approvedById,
    });
    return null;
  } catch (error) {
    console.error('LEDGER POST FAILED bank', rawLog.id, error.message);
    return 'The deposit was matched but the books entry could not be saved. Tell your treasurer so it can be corrected.';
  }
}

// Process a single RawBankLog entry
export async function processRawLog(rawLogId) {
  const rawLog = await prisma.rawBankLog.findUnique({
    where: { id: rawLogId },
    include: { stokvel: true },
  });

  if (!rawLog) return null;
  if (rawLog.matchedMemberId) return null; // Already processed

  const refCode = extractReferenceCode(rawLog.narration);

  if (refCode && rawLog.direction === 'CREDIT') {
    const member = await prisma.stokvelMember.findFirst({
      where: { stokvelId: rawLog.stokvelId, referenceCode: refCode },
    });

    if (member) {
      // A manual "run reconciliation" trigger and the auto-run that follows
      // every createRawLog call can both reach this same rawLogId. Gate the
      // claim atomically so only one caller wins it and only one Contribution
      // and one ledger credit exist for the bank entry.
      const claimed = await prisma.$transaction(async (tx) => {
        const claim = await tx.rawBankLog.updateMany({
          where: { id: rawLog.id, matchedMemberId: null },
          data: { matchedMemberId: member.id },
        });
        if (claim.count === 0) return false;

        await tx.contribution.create({
          data: {
            stokvelId: rawLog.stokvelId,
            memberId: member.id,
            amount: rawLog.amount,
            status: 'CONFIRMED',
            rawBankLogId: rawLog.id,
          },
        });

        await upsertGroupLedgerTx(tx, rawLog.stokvelId, rawLog.amount);
        return true;
      });

      if (!claimed) return null; // Someone else's concurrent call already matched it

      const ledgerWarning = await postBankContribution({ rawLog, member });
      return { status: 'MATCHED', memberId: member.id, amount: rawLog.amount, ledgerWarning };
    }
  }

  // No match — leave for official review
  return { status: 'UNMATCHED', narration: rawLog.narration, amount: rawLog.amount };
}

// Run reconciliation on all unmatched raw logs for a stokvel
export async function runReconciliation(stokvelId) {
  const unmatched = await prisma.rawBankLog.findMany({
    where: { stokvelId, matchedMemberId: null },
    orderBy: { receivedAt: 'asc' },
  });

  const results = { matched: 0, unmatched: 0, errors: [] };

  for (const log of unmatched) {
    try {
      const result = await processRawLog(log.id);
      // null means a concurrent call already claimed this exact log — not an
      // error, just nothing left for this call to do for it.
      if (!result) continue;
      if (result.status === 'MATCHED') results.matched++;
      else results.unmatched++;
    } catch (error) {
      results.errors.push({ logId: log.id, error: error.message });
    }
  }

  return results;
}

// Manual assignment by officials (for unmatched entries). Only for CREDIT
// entries — a bank entry a member paid in. Record an outgoing (DEBIT)
// transaction as a group expense instead (see recordGroupExpense).
export async function manualAssign(rawLogId, memberId, officialId) {
  const rawLog = await prisma.rawBankLog.findUnique({ where: { id: rawLogId } });
  if (!rawLog) throw new Error('Raw log not found');
  if (rawLog.matchedMemberId) throw new Error('Already matched');
  if (rawLog.direction !== 'CREDIT') {
    throw new Error('Only a CREDIT entry can be assigned as a member contribution — record a DEBIT as a group expense instead');
  }

  const member = await prisma.stokvelMember.findFirst({
    where: { id: memberId, stokvelId: rawLog.stokvelId },
  });
  if (!member) throw new Error('Member not found in this stokvel');

  const official = await prisma.stokvelOfficial.findFirst({
    where: { stokvelId: rawLog.stokvelId, userId: officialId },
  });
  if (!official) throw new Error('Only officials can manually assign transactions');

  // Nobody assigns a deposit to themselves; that is how money gets credited to the wrong person.
  if (member.userId === officialId) {
    throw new Error('You cannot assign a deposit to yourself. Another official must do it.');
  }

  // Two officials assigning the same raw log at once could both pass the plain
  // check above. Claim atomically so only one creates the contribution.
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.rawBankLog.updateMany({
      where: { id: rawLog.id, matchedMemberId: null },
      data: { matchedMemberId: member.id },
    });
    if (claim.count === 0) return false;

    await tx.contribution.create({
      data: {
        stokvelId: rawLog.stokvelId,
        memberId: member.id,
        amount: rawLog.amount,
        status: 'CONFIRMED',
        rawBankLogId: rawLog.id,
      },
    });

    await upsertGroupLedgerTx(tx, rawLog.stokvelId, rawLog.amount);
    return true;
  });

  if (!claimed) throw new Error('Already matched');

  const ledgerWarning = await postBankContribution({ rawLog, member, approvedById: officialId });
  return { status: 'MANUALLY_ASSIGNED', memberId: member.id, amount: rawLog.amount, ledgerWarning };
}

// Get unmatched queue for officials
export async function getUnmatchedQueue(stokvelId) {
  return prisma.rawBankLog.findMany({
    where: { stokvelId, matchedMemberId: null },
    orderBy: { receivedAt: 'desc' },
  });
}

// Get group ledger
export async function getGroupLedger(stokvelId) {
  return prisma.stokvelGroupLedger.findUnique({
    where: { stokvelId },
    include: {
      stokvel: {
        include: {
          members: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  });
}

// Helper: create or update group ledger. Takes the Prisma client (or an
// active $transaction's tx) explicitly so callers running inside a
// transaction don't accidentally issue this write outside it.
async function upsertGroupLedgerTx(client, stokvelId, delta) {
  const existing = await client.stokvelGroupLedger.findUnique({
    where: { stokvelId },
  });

  if (existing) {
    await client.stokvelGroupLedger.update({
      where: { stokvelId },
      data: {
        totalBalance: { increment: delta },
        updatedAt: new Date(),
      },
    });
  } else {
    await client.stokvelGroupLedger.create({
      data: { stokvelId, totalBalance: delta },
    });
  }
}
