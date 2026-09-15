// server/adapters/PaymentAdapter.js
// iCamagu — Abstract Payment Service Provider (PSP) Adapter
// Mirrors BankingAdapter.js's role for bank rails: defines the contract any
// real gateway (PayFast today; Stitch/Ozow could follow later) must
// implement, so paymentService and the controllers that call it never need
// to know which PSP is actually wired up.
// Culture before capital. 🌾

export class PaymentAdapter {
  constructor(config) {
    this.config = config;
  }

  // Starts a hosted checkout session for one PoolPayment. Returns
  // { redirectUrl } — where the member's browser should go to pay.
  // iCamagu never touches card/bank credentials directly; PCI/security
  // scope for the actual payment instrument stays entirely with the PSP.
  createPaymentSession(payment, { returnUrl, cancelUrl, notifyUrl, itemName, buyerEmail }) {
    throw new Error('createPaymentSession() must be implemented by subclass');
  }

  // Verifies an inbound webhook really came from this PSP. Must throw if it
  // didn't — callers treat a thrown error as "do not trust this payload."
  async verifyWebhook(rawBody, headers) {
    throw new Error('verifyWebhook() must be implemented by subclass');
  }

  // Normalizes an already-verified webhook payload into a common shape:
  // { paymentId, providerReference, status, amountZAR, raw }.
  parseWebhookPayload(rawBody) {
    throw new Error('parseWebhookPayload() must be implemented by subclass');
  }
}
