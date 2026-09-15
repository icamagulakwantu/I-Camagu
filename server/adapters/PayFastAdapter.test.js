import { describe, it, expect, vi, afterEach } from 'vitest';
import crypto from 'crypto';
import { PayFastAdapter } from './PayFastAdapter.js';

const CREDS = { merchantId: '10000100', merchantKey: '46f0cd694581a', sandbox: true };

function expectedSignature(paramString, passphrase) {
  const signedString = passphrase ? `${paramString}&passphrase=${passphrase}` : paramString;
  return crypto.createHash('md5').update(signedString).digest('hex');
}

describe('PayFastAdapter construction', () => {
  it('refuses to construct without merchant credentials — never falls back to a dummy signer', () => {
    expect(() => new PayFastAdapter({})).toThrow(/PayFast is not configured/);
  });

  it('defaults to the sandbox host, and only leaves it when explicitly told sandbox: false', () => {
    expect(new PayFastAdapter(CREDS).host).toBe('sandbox.payfast.co.za');
    expect(new PayFastAdapter({ ...CREDS, sandbox: false }).host).toBe('www.payfast.co.za');
  });
});

describe('createPaymentSession', () => {
  it('produces a redirect URL whose signature matches PayFast\'s own MD5 algorithm', () => {
    const adapter = new PayFastAdapter(CREDS);
    const payment = { id: 'pay_abc123', amountZAR: '149.90' };
    const { redirectUrl } = adapter.createPaymentSession(payment, {
      returnUrl: 'https://i-camagu-1.onrender.com/orders?payment=success',
      cancelUrl: 'https://i-camagu-1.onrender.com/orders?payment=cancelled',
      notifyUrl: 'https://i-camagu-1.onrender.com/api/webhooks/payfast',
      itemName: 'iCamagu bulk order',
      buyerEmail: 'member@example.com',
    });

    const [, query] = redirectUrl.split('?');
    const params = new URLSearchParams(query);
    const receivedSignature = params.get('signature');

    const paramString = query.replace(/&signature=[^&]*$/, '');
    expect(receivedSignature).toBe(expectedSignature(paramString));
    expect(redirectUrl).toMatch(/^https:\/\/sandbox\.payfast\.co\.za\/eng\/process\?/);
  });

  it('uses PHP urlencode-style encoding — spaces become + rather than %20', () => {
    const adapter = new PayFastAdapter(CREDS);
    const { redirectUrl } = adapter.createPaymentSession(
      { id: 'pay_1', amountZAR: '10.00' },
      { returnUrl: 'https://x.test/ok', cancelUrl: 'https://x.test/no', notifyUrl: 'https://x.test/hook', itemName: 'iCamagu bulk order' }
    );
    expect(redirectUrl).toContain('item_name=iCamagu+bulk+order');
    expect(redirectUrl).not.toContain('%20');
  });

  it('signs with the passphrase when one is configured', () => {
    const adapter = new PayFastAdapter({ ...CREDS, passphrase: 'letmein' });
    const { redirectUrl } = adapter.createPaymentSession(
      { id: 'pay_2', amountZAR: '25.00' },
      { returnUrl: 'https://x.test/ok', cancelUrl: 'https://x.test/no', notifyUrl: 'https://x.test/hook', itemName: 'Order' }
    );
    const [, query] = redirectUrl.split('?');
    const params = new URLSearchParams(query);
    const paramString = query.replace(/&signature=[^&]*$/, '');
    expect(params.get('signature')).toBe(expectedSignature(paramString, 'letmein'));
  });
});

describe('parseWebhookPayload', () => {
  it('maps PayFast\'s field names onto our own vocabulary', () => {
    const adapter = new PayFastAdapter(CREDS);
    const rawBody = 'm_payment_id=pay_abc123&pf_payment_id=98765&payment_status=COMPLETE&amount_gross=149.90';
    const parsed = adapter.parseWebhookPayload(rawBody);

    expect(parsed).toMatchObject({
      paymentId: 'pay_abc123',
      providerReference: '98765',
      status: 'COMPLETE',
      amountZAR: '149.90',
    });
    expect(parsed.raw.m_payment_id).toBe('pay_abc123');
  });
});

describe('verifyWebhook', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects a payload with no signature before ever calling PayFast', async () => {
    const adapter = new PayFastAdapter(CREDS);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(adapter.verifyWebhook('m_payment_id=pay_1&amount_gross=10.00')).rejects.toThrow(/missing signature/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a forged signature before ever calling PayFast', async () => {
    const adapter = new PayFastAdapter(CREDS);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const rawBody = 'm_payment_id=pay_1&amount_gross=10.00&signature=not-the-real-one';
    await expect(adapter.verifyWebhook(rawBody)).rejects.toThrow(/signature mismatch/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('accepts a correctly signed payload only once PayFast\'s own validate endpoint also confirms it', async () => {
    const adapter = new PayFastAdapter(CREDS);
    const withoutSig = 'm_payment_id=pay_1&amount_gross=10.00';
    const signature = expectedSignature(withoutSig);
    const rawBody = `${withoutSig}&signature=${signature}`;

    const fetchSpy = vi.fn().mockResolvedValue({ text: async () => 'VALID' });
    vi.stubGlobal('fetch', fetchSpy);

    await expect(adapter.verifyWebhook(rawBody)).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://sandbox.payfast.co.za/eng/query/validate',
      expect.objectContaining({ method: 'POST', body: rawBody })
    );
  });

  it('rejects a correctly signed payload if PayFast\'s validate endpoint disagrees', async () => {
    const adapter = new PayFastAdapter(CREDS);
    const withoutSig = 'm_payment_id=pay_1&amount_gross=10.00';
    const signature = expectedSignature(withoutSig);
    const rawBody = `${withoutSig}&signature=${signature}`;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => 'INVALID' }));

    await expect(adapter.verifyWebhook(rawBody)).rejects.toThrow(/failed server-side validation/);
  });
});
