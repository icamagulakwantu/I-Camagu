// server/adapters/ManualEFTAdapter.js
// iCamagu — Manual EFT Adapter (stub)
// No live bank APIs. Records are created manually by officials
// until African Bank / GoTyme agreements are signed.
// Culture before capital. 🌾

import { BankingAdapter } from './BankingAdapter.js';
import prisma from '../config/db.js';

export class ManualEFTAdapter extends BankingAdapter {
  constructor(config) {
    super(config);
    this.stokvelId = config.stokvelId;
  }

  async createSubAccount(memberId, stokvelId) {
    // Generate a reference code for manual EFT matching
    const member = await prisma.stokvelMember.findFirst({
      where: { stokvelId, userId: memberId },
    });
    return member?.referenceCode || null;
  }

  async getBalance(subAccountRef) {
    // Sum all confirmed contributions for this member
    const result = await prisma.contribution.aggregate({
      where: {
        memberId: subAccountRef,
        status: 'CONFIRMED',
      },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  async recordContribution(subAccountRef, amount, ref) {
    // Manual EFT: officials log contributions via reconciliation service
    // This stub returns a placeholder record
    return {
      id: `manual-${Date.now()}`,
      subAccountRef,
      amount,
      reference: ref,
      status: 'PENDING',
      recordedAt: new Date(),
    };
  }

  async initiatePayout(subAccountRef, amount, destination) {
    // Manual EFT: creates a PENDING_APPROVAL payout record
    // Actual bank transfer happens outside iCamagu
    return {
      id: `payout-${Date.now()}`,
      subAccountRef,
      amount,
      destination,
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    };
  }

  async reconcile(stokvelId) {
    // Manual EFT: return all unmatched RawBankLog entries for review
    const unmatched = await prisma.rawBankLog.findMany({
      where: {
        stokvelId,
        matchedMemberId: null,
      },
      orderBy: { receivedAt: 'desc' },
    });
    return unmatched;
  }

  async ingestWebhook(payload) {
    // Manual EFT: webhooks are not received from banks
    // Instead, officials manually create RawBankLog entries
    // This method is a no-op for the manual adapter
    return { ingested: false, reason: 'Manual EFT — no live webhook ingestion' };
  }
}
