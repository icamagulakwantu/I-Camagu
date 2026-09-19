// server/services/messageService.js
// In-app text messaging — deliberately narrow: a message can only ever be
// sent between two users with a mutually-accepted ClanConnection (see
// izidukoService.isAcceptedConnection). This isn't a general chat feature;
// it exists specifically so a matched Iziduko connection can actually talk
// once they've found each other, without handing out phone numbers first.
import prisma from '../config/db.js';
import { isAcceptedConnection } from './izidukoService.js';

const MAX_MESSAGE_LENGTH = 2000;

async function requireConnected(userAId, userBId) {
  const connected = await isAcceptedConnection(userAId, userBId);
  if (!connected) {
    const err = new Error('You can only message someone you are connected with');
    err.status = 403;
    throw err;
  }
}

export async function sendMessage(senderId, recipientId, body) {
  if (senderId === recipientId) {
    const err = new Error('You cannot message yourself');
    err.status = 400;
    throw err;
  }

  const trimmed = (body || '').trim();
  if (!trimmed) {
    const err = new Error('Message cannot be empty');
    err.status = 400;
    throw err;
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    const err = new Error(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`);
    err.status = 400;
    throw err;
  }

  await requireConnected(senderId, recipientId);

  return prisma.message.create({ data: { senderId, recipientId, body: trimmed } });
}

// The full thread between two people, oldest first — and marks every
// message the viewer just received as read, since opening the thread is
// exactly the moment those messages have actually been seen.
export async function getConversation(userId, otherId) {
  await requireConnected(userId, otherId);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, recipientId: otherId },
        { senderId: otherId, recipientId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  await prisma.message.updateMany({
    where: { senderId: otherId, recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });

  return messages;
}

// One row per connected person, with their last message (if any exists yet
// — a fresh connection with no messages is still listed, just empty) and
// how many of their messages to this user are still unread. Read, not
// write, so it's fine that this is N+1 queries per connection — this app
// has no volume yet that would make that worth optimising away.
export async function listConversations(userId) {
  const { getClanConnections } = await import('./izidukoService.js');
  const connectedUsers = await getClanConnections(userId);

  const results = await Promise.all(connectedUsers.map(async (other) => {
    const [lastMessage, unreadCount] = await Promise.all([
      prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, recipientId: other.id },
            { senderId: other.id, recipientId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.count({ where: { senderId: other.id, recipientId: userId, readAt: null } }),
    ]);
    return { user: other, lastMessage, unreadCount };
  }));

  results.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
    const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return results;
}
