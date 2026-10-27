import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = { user: { update: vi.fn() } };
vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('../services/encryptionService.js', () => ({
  encryptSensitive: vi.fn(() => 'encrypted'),
  decryptSensitive: vi.fn(() => 'decrypted'),
}));
vi.mock('../services/idValidation.js', () => ({ validateSaIdNumber: vi.fn(() => ({ valid: true })) }));
vi.mock('../config/admin.js', () => ({ isAdminEmail: vi.fn(() => false) }));

const { submitIdentityVerification } = await import('./identityController.js');

function responseRecorder() {
  return {
    statusCode: 200, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('identity document upload validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.update.mockResolvedValue({
      identityVerificationStatus: 'PENDING',
      idNumberLast4: '1234',
      identitySubmittedAt: new Date('2026-01-01T00:00:00Z'),
    });
  });

  it('rejects non-image data before writing personal identity data', async () => {
    const res = responseRecorder();
    await submitIdentityVerification({ userId: 'user-1', body: { idNumber: '1234567890123', idDocumentUrl: 'data:text/html;base64,PHNjcmlwdD4=' } }, res);
    expect(res.statusCode).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects decoded image data above 2 MB before writing', async () => {
    const oversizedBase64 = 'A'.repeat(Math.ceil((2_000_001 * 4) / 3));
    const res = responseRecorder();
    await submitIdentityVerification({ userId: 'user-1', body: { idNumber: '1234567890123', idDocumentUrl: `data:image/jpeg;base64,${oversizedBase64}` } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/too large/);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('accepts supported image data within the limit', async () => {
    const res = responseRecorder();
    await submitIdentityVerification({ userId: 'user-1', body: { idNumber: '1234567890123', idDocumentUrl: 'data:image/png;base64,aGVsbG8=' } }, res);
    expect(res.statusCode).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: expect.objectContaining({ idDocumentUrl: 'data:image/png;base64,aGVsbG8=', identityVerificationStatus: 'PENDING' }),
    }));
  });
});
