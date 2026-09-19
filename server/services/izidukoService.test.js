import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  clanConnection: { findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
};
vi.mock('../config/db.js', () => ({ default: mockPrisma }));

const { isAcceptedConnection, getConnectedUserProfile } = await import('./izidukoService.js');

describe('isAcceptedConnection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is true when an ACCEPTED ClanConnection exists in either direction', async () => {
    mockPrisma.clanConnection.findFirst.mockResolvedValue({ id: 'conn_1', status: 'ACCEPTED' });
    expect(await isAcceptedConnection('user_a', 'user_b')).toBe(true);
    expect(mockPrisma.clanConnection.findFirst).toHaveBeenCalledWith({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: 'user_a', recipientId: 'user_b' },
          { requesterId: 'user_b', recipientId: 'user_a' },
        ],
      },
    });
  });

  it('is false when no ACCEPTED connection exists — pending or none at all', async () => {
    mockPrisma.clanConnection.findFirst.mockResolvedValue(null);
    expect(await isAcceptedConnection('user_a', 'user_b')).toBe(false);
  });
});

describe('getConnectedUserProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses to return a profile for two people who are not connected — the actual gate, not just a UI hide', async () => {
    mockPrisma.clanConnection.findFirst.mockResolvedValue(null);
    await expect(getConnectedUserProfile('viewer_1', 'target_1')).rejects.toThrow(/only view the full profile/);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('never leaks identity-verification fields — only the same fields a member sees on their own Personal/Clan tabs', async () => {
    mockPrisma.clanConnection.findFirst.mockResolvedValue({ id: 'conn_1', status: 'ACCEPTED' });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'target_1', firstName: 'A', lastName: 'B' });

    await getConnectedUserProfile('viewer_1', 'target_1');

    const selectArg = mockPrisma.user.findUnique.mock.calls[0][0].select;
    expect(selectArg).toMatchObject({
      firstName: true, lastName: true, profileImage: true,
      paternalIziduko: true, maternalIziduko: true, address: true, age: true, phoneNumber: true,
    });
    expect(selectArg.idNumberEncrypted).toBeUndefined();
    expect(selectArg.idDocumentUrl).toBeUndefined();
    expect(selectArg.identityVerificationStatus).toBeUndefined();
    expect(selectArg.email).toBeUndefined();
    expect(selectArg.passwordHash).toBeUndefined();
  });
});
