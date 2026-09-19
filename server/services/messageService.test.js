import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  message: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
};
vi.mock('../config/db.js', () => ({ default: mockPrisma }));

const mockIsAcceptedConnection = vi.fn();
vi.mock('./izidukoService.js', () => ({
  isAcceptedConnection: mockIsAcceptedConnection,
  getClanConnections: vi.fn().mockResolvedValue([]),
}));

const { sendMessage, getConversation } = await import('./messageService.js');

describe('sendMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses to send to someone you are not connected with — the actual gate behind "matched only"', async () => {
    mockIsAcceptedConnection.mockResolvedValue(false);
    await expect(sendMessage('sender_1', 'recipient_1', 'hello')).rejects.toThrow(/only message someone you are connected with/);
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });

  it('refuses an empty or whitespace-only message', async () => {
    mockIsAcceptedConnection.mockResolvedValue(true);
    await expect(sendMessage('sender_1', 'recipient_1', '   ')).rejects.toThrow(/cannot be empty/);
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });

  it('refuses a message over the length limit', async () => {
    mockIsAcceptedConnection.mockResolvedValue(true);
    await expect(sendMessage('sender_1', 'recipient_1', 'x'.repeat(2001))).rejects.toThrow(/too long/);
  });

  it('refuses messaging yourself', async () => {
    await expect(sendMessage('user_1', 'user_1', 'hi')).rejects.toThrow(/cannot message yourself/);
    expect(mockIsAcceptedConnection).not.toHaveBeenCalled();
  });

  it('sends a valid message once connected, trimmed', async () => {
    mockIsAcceptedConnection.mockResolvedValue(true);
    mockPrisma.message.create.mockResolvedValue({ id: 'msg_1', body: 'hello' });

    await sendMessage('sender_1', 'recipient_1', '  hello  ');

    expect(mockPrisma.message.create).toHaveBeenCalledWith({
      data: { senderId: 'sender_1', recipientId: 'recipient_1', body: 'hello' },
    });
  });
});

describe('getConversation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses to return a thread for two people who are not connected', async () => {
    mockIsAcceptedConnection.mockResolvedValue(false);
    await expect(getConversation('user_1', 'user_2')).rejects.toThrow(/only message someone you are connected with/);
    expect(mockPrisma.message.findMany).not.toHaveBeenCalled();
  });

  it('marks incoming messages as read once the thread is opened', async () => {
    mockIsAcceptedConnection.mockResolvedValue(true);
    mockPrisma.message.findMany.mockResolvedValue([]);

    await getConversation('user_1', 'user_2');

    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
      where: { senderId: 'user_2', recipientId: 'user_1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});
