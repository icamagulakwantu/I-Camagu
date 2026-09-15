// server/adapters/PayFastAdapter.js
// iCamagu — PayFast Adapter (sandbox-first)
// Real PSP integration for PoolPayment (SmartMatch bulk order payments).
// Defaults to PayFast's public sandbox (sandbox.payfast.co.za) until real
// merchant credentials and PAYFAST_SANDBOX=false are set — see
// server/services/paymentService.js for how those env vars gate this.
// Culture before capital. 🌾

import crypto from 'crypto';
import { PaymentAdapter } from './PaymentAdapter.js';

const SANDBOX_HOST = 'sandbox.payfast.co.za';
const LIVE_HOST = 'www.payfast.co.za';

// PayFast's signature algorithm expects PHP's urlencode() convention
// (spaces as '+'), not JS's encodeURIComponent default ('%20'). Both the
// outbound request signature and the inbound ITN check must use this same
// encoding, or the hash will never match.
function pfEncode(value) {
  return encodeURIComponent(String(value).trim()).replace(/%20/g, '+');
}

export class PayFastAdapter extends PaymentAdapter {
  constructor({ merchantId, merchantKey, passphrase, sandbox = true } = {}) {
    super({ merchantId, merchantKey, sandbox });
    if (!merchantId || !merchantKey) {
      throw new Error('PayFast is not configured — PAYFAST_MERCHANT_ID / PAYFAST_MERCHANT_KEY missing');
    }
    this.merchantId = merchantId;
    this.merchantKey = merchantKey;
    this.passphrase = passphrase || '';
    this.sandbox = sandbox;
    this.host = sandbox ? SANDBOX_HOST : LIVE_HOST;
  }

  createPaymentSession(payment, { returnUrl, cancelUrl, notifyUrl, itemName, buyerEmail }) {
    // Field order matters for the signature — PayFast hashes the exact
    // concatenated string, so build it once and reuse the same order for
    // both the query string and the signed string.
    const fields = {
      merchant_id: this.merchantId,
      merchant_key: this.merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      // Our own PoolPayment.id — PayFast echoes this back on the ITN
      // (m_payment_id) so the webhook knows which row to update. PayFast's
      // own pf_payment_id (their transaction id) isn't known until after
      // checkout, so it can't be the lookup key here.
      m_payment_id: payment.id,
      amount: Number(payment.amountZAR).toFixed(2),
      item_name: String(itemName).slice(0, 100), // PayFast's own field cap
    };
    if (buyerEmail) fields.email_address = buyerEmail;

    const pairs = Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== '');
    const paramString = pairs.map(([k, v]) => `${k}=${pfEncode(v)}`).join('&');
    const signedString = this.passphrase
      ? `${paramString}&passphrase=${pfEncode(this.passphrase)}`
      : paramString;
    const signature = crypto.createHash('md5').update(signedString).digest('hex');

    return { redirectUrl: `https://${this.host}/eng/process?${paramString}&signature=${signature}` };
  }

  // Two checks, both required, per PayFast's own published security
  // checklist for validating an ITN (webhook):
  //  1. Signature match — computed on the raw posted body, not a
  //     re-encoded reconstruction, so it can't disagree with however
  //     PayFast itself encoded the values it signed.
  //  2. A server-to-server "validate" call back to PayFast confirming they
  //     really sent this. A signature match alone isn't PayFast's
  //     recommended bar — if the passphrase were ever to leak, a forged
  //     signature would still pass check 1 alone.
  async verifyWebhook(rawBody) {
    const params = new URLSearchParams(rawBody);
    const receivedSignature = params.get('signature');
    if (!receivedSignature) throw new Error('PayFast ITN missing signature');

    const withoutSignature = rawBody
      .split('&')
      .filter((pair) => !pair.startsWith('signature='))
      .join('&');
    const signedString = this.passphrase
      ? `${withoutSignature}&passphrase=${pfEncode(this.passphrase)}`
      : withoutSignature;
    const expectedSignature = crypto.createHash('md5').update(signedString).digest('hex');
    if (expectedSignature !== receivedSignature) {
      throw new Error('PayFast ITN signature mismatch');
    }

    const response = await fetch(`https://${this.host}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: rawBody,
    });
    const text = (await response.text()).trim();
    if (text !== 'VALID') {
      throw new Error(`PayFast ITN failed server-side validation: ${text || 'no response'}`);
    }
  }

  parseWebhookPayload(rawBody) {
    const params = new URLSearchParams(rawBody);
    return {
      paymentId: params.get('m_payment_id'),
      providerReference: params.get('pf_payment_id'),
      // PayFast's own vocabulary: 'COMPLETE' | 'FAILED' | 'CANCELLED'.
      status: params.get('payment_status'),
      amountZAR: params.get('amount_gross'),
      raw: Object.fromEntries(params.entries()),
    };
  }
}
