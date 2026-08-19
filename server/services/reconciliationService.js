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
                                          // Mark as matched
                                                await prisma.rawBankLog.update({
                                                            where: { id: rawLog.id },
                                                                    data: { matchedMemberId: member.id },
                                                });

                                                      // Create contribution record
                                                            await prisma.contribution.create({
                                                                        data: {
                                                                                      stokvelId: rawLog.stokvelId,
                                                                                                memberId: member.id,
                                                                                                          amount: rawLog.amount,
                                                                                                                    status: 'CONFIRMED',
                                                                                                                              rawBankLogId: rawLog.id,
                                                                        },
                                                            });

                                                                  // Update group ledger
                                                                        await upsertGroupLedger(rawLog.stokvelId, rawLog.amount);

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
                                  if (result.status === 'MATCHED') results.matched++;
                                        else results.unmatched++;
                  } catch (error) {
                            results.errors.push({ logId: log.id, error: error.message });
                  }
          }

            return results;
}

// Manual assignment by officials (for unmatched entries)
export async function manualAssign(rawLogId, memberId, officialId) {
      const rawLog = await prisma.rawBankLog.findUnique({ where: { id: rawLogId } });
        if (!rawLog) throw new Error('Raw log not found');
          if (rawLog.matchedMemberId) throw new Error('Already matched');

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

                      // Mark as matched
                        await prisma.rawBankLog.update({
                                where: { id: rawLog.id },
                                    data: { matchedMemberId: member.id },
                        });

                          // Create contribution
                            await prisma.contribution.create({
                                    data: {
                                              stokvelId: rawLog.stokvelId,
                                                    memberId: member.id,
                                                          amount: rawLog.amount,
                                                                status: 'CONFIRMED',
                                                                      rawBankLogId: rawLog.id,
                                    },
                            });

                              // Update group ledger
                                await upsertGroupLedger(rawLog.stokvelId, rawLog.amount);

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

// Helper: create or update group ledger
async function upsertGroupLedger(stokvelId, delta) {
      const existing = await prisma.stokvelGroupLedger.findUnique({
              where: { stokvelId },
      });

        if (existing) {
                await prisma.stokvelGroupLedger.update({
                          where: { stokvelId },
                                data: {
                                            totalBalance: {
                                                          increment: delta,
                                            },
                                                    updatedAt: new Date(),
                                },
                });
        } else {
                await prisma.stokvelGroupLedger.create({
                          data: {
                                      stokvelId,
                                              totalBalance: delta,
                          },
                });
        }
}
