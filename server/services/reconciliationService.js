// server/services/reconciliationService.js
// iCamagu — Three-Layer Reconciliation Engine
// RawBankLog → StokvelGroupLedger → Member Contribution
// Culture before capital. 🌾

import prisma from '../config/db.js';

const STK_REF_REGEX = /STK-([A-Z]{3})-(\d{3})/;

// Parse a reference code from bank narration
export function extractReferenceCode(narration) {
      if (!narration) return null;
        const match = narration.match(STK_REF_REGEX);
          return match ? match[0] : null;
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
                        // Find the member by reference code
                            const member = await prisma.stokvelMember.findFirst({
                                      where: {
                                                  stokvelId: rawLog.stokvelId,
                                                          referenceCode: refCode,
                                      },
                            });

                                if (member) {
                                          // A manual "run reconciliation" trigger and the auto-run that
                                          // follows every createRawLog call can both reach this same
                                          // rawLogId around the same time — the plain matchedMemberId
                                          // check above reads before either write commits. Gate the
                                          // claim atomically so only one caller can win it; the other
                                          // must not create a second Contribution or double-credit the
                                          // ledger for the same bank entry.
                                          const claimed = await prisma.$transaction(async (tx) => {
                                                const claim = await tx.rawBankLog.updateMany({
                                                      where: { id: rawLog.id, matchedMemberId: null },
                                                      data: { matchedMemberId: member.id },
                                                });
                                                if (claim.count === 0) return false;

                                                // Create contribution record
                                                await tx.contribution.create({
                                                      data: {
                                                            stokvelId: rawLog.stokvelId,
                                                            memberId: member.id,
                                                            amount: rawLog.amount,
                                                            status: 'CONFIRMED',
                                                            rawBankLogId: rawLog.id,
                                                      },
                                                });

                                                // Update group ledger
                                                await upsertGroupLedgerTx(tx, rawLog.stokvelId, rawLog.amount);
                                                return true;
                                          });

                                          if (!claimed) return null; // Someone else's concurrent call already matched it

                                          return { status: 'MATCHED', memberId: member.id, amount: rawLog.amount };
                                }
                }

                  // No match — leave for official review
                    return { status: 'UNMATCHED', narration: rawLog.narration, amount: rawLog.amount };
}

// Run reconciliation on all unmatched raw logs for a stokvel
export async function runReconciliation(stokvelId) {
      const unmatched = await prisma.rawBankLog.findMany({
              where: {
                        stokvelId,
                              matchedMemberId: null,
              },
                  orderBy: { receivedAt: 'asc' },
      });

        const results = { matched: 0, unmatched: 0, errors: [] };

          for (const log of unmatched) {
                  try {
                            const result = await processRawLog(log.id);
                                  // null means a concurrent call (another runReconciliation, or a
                                  // manualAssign) already claimed this exact log in between the
                                  // findMany above and this iteration reaching it — not an error,
                                  // just nothing left for this call to do for it.
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
// entries — a bank entry a member paid in. A DEBIT (money leaving the
// account) isn't a member "contribution" and previously got mismatched as
// one here, which also incremented the group ledger instead of decrementing
// it (the same +amount call as the CREDIT path, since direction was never
// consulted). Record an outgoing transaction as a group expense instead
// (see recordGroupExpense) — that already handles the sign correctly.
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

                // Verify official status
                  const official = await prisma.stokvelOfficial.findFirst({
                          where: {
                                    stokvelId: rawLog.stokvelId,
                                          userId: officialId,
                          },
                  });
                    if (!official) throw new Error('Only officials can manually assign transactions');

                      // Two officials assigning the same raw log at once (or this racing
                      // against the auto-run in processRawLog) could both pass the plain
                      // matchedMemberId check above before either write commits. Gate the
                      // claim atomically inside one transaction so only one caller can
                      // create the contribution and touch the ledger for this entry.
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

                                  return { status: 'MANUALLY_ASSIGNED', memberId: member.id, amount: rawLog.amount };
}

// Get unmatched queue for officials
export async function getUnmatchedQueue(stokvelId) {
      return prisma.rawBankLog.findMany({
              where: {
                        stokvelId,
                              matchedMemberId: null,
              },
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
                                            totalBalance: {
                                                          increment: delta,
                                            },
                                                    updatedAt: new Date(),
                                },
                });
        } else {
                await client.stokvelGroupLedger.create({
                          data: {
                                      stokvelId,
                                              totalBalance: delta,
                          },
                });
        }
}