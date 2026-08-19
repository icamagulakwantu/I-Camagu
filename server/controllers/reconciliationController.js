// server/controllers/reconciliationController.js
// iCamagu — Reconciliation Controller
// Manual EFT entry, webhook simulation, official review queue.
// Culture before capital. 🌾

import prisma from '../config/db.js';
import {
      runReconciliation,
        manualAssign,
          getUnmatchedQueue,
            getGroupLedger,
} from '../services/reconciliationService.js';

// Manually create a RawBankLog entry (for Manual EFT — no live webhooks yet)
export async function createRawLog(req, res) {
      const { stokvelId, narration, amount, direction } = req.body;

        if (!stokvelId || !amount || !direction) {
                return res.status(400).json({ error: 'stokvelId, amount, and direction are required' });
        }

          if (!['CREDIT', 'DEBIT'].includes(direction)) {
                  return res.status(400).json({ error: 'direction must be CREDIT or DEBIT' });
          }

            try {
                    // Verify user is an official of this stokvel
                        const official = await prisma.stokvelOfficial.findFirst({
                                  where: { stokvelId, userId: req.userId },
                        });
                            if (!official) {
                                      return res.status(403).json({ error: 'Only officials can log transactions' });
                            }

                                const rawLog = await prisma.rawBankLog.create({
                                          data: {
                                                      stokvelId,
                                                              rawPayload: { manuallyEntered: true, enteredBy: req.userId },
                                                                      narration: narration || null,
                                                                              amount,
                                                                                      direction,
                                          },
                                });

                                    // Auto-run reconciliation on this new entry
                                        const result = await runReconciliation(stokvelId);

                                            res.status(201).json({
                                                      rawLog,
                                                            reconciliation: result,
                                                                  message: 'Transaction logged and reconciliation attempted',
                                            });
            } catch (error) {
                    console.error('Create raw log error:', error.message);
                        res.status(500).json({ error: 'Could not log transaction' });
            }
}

// Trigger reconciliation run
export async function triggerReconciliation(req, res) {
      const { stokvelId } = req.params;

        try {
                // Verify user is an official
                    const official = await prisma.stokvelOfficial.findFirst({
                              where: { stokvelId, userId: req.userId },
                    });
                        if (!official) {
                                  return res.status(403).json({ error: 'Only officials can run reconciliation' });
                        }

                            const result = await runReconciliation(stokvelId);
                                res.json(result);
        } catch (error) {
                console.error('Trigger reconciliation error:', error.message);
                    res.status(500).json({ error: 'Could not run reconciliation' });
        }
}

// Get unmatched queue for review
export async function getUnmatched(req, res) {
      const { stokvelId } = req.params;

        try {
                const official = await prisma.stokvelOfficial.findFirst({
                          where: { stokvelId, userId: req.userId },
                });
                    if (!official) {
                              return res.status(403).json({ error: 'Only officials can view the review queue' });
                    }

                        const queue = await getUnmatchedQueue(stokvelId);
                            res.json({ unmatched: queue });
        } catch (error) {
                console.error('Get unmatched error:', error.message);
                    res.status(500).json({ error: 'Could not fetch review queue' });
        }
}

// Manually assign an unmatched transaction to a member
export async function assignTransaction(req, res) {
      const { rawLogId, memberId } = req.body;

        if (!rawLogId || !memberId) {
                return res.status(400).json({ error: 'rawLogId and memberId are required' });
        }

          try {
                  const result = await manualAssign(rawLogId, memberId, req.userId);
                      res.json(result);
          } catch (error) {
                  console.error('Manual assign error:', error.message);
                      res.status(400).json({ error: error.message });
          }
}

// Get group ledger
export async function getLedger(req, res) {
      const { stokvelId } = req.params;

        try {
                // Any member can view the group ledger
                    const membership = await prisma.stokvelMember.findFirst({
                              where: { stokvelId, userId: req.userId },
                    });
                        if (!membership) {
                                  return res.status(403).json({ error: 'You are not a member of this stokvel' });
                        }

                            const ledger = await getGroupLedger(stokvelId);
                                res.json({ ledger });
        } catch (error) {
                console.error('Get ledger error:', error.message);
                    res.status(500).json({ error: 'Could not fetch ledger' });
        }
}
