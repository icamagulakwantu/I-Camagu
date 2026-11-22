import prisma from '../config/db.js';
import { kickPushSender } from './pushService.js';

// Every notification also goes to the person's phones, if they turned phone
// notifications on (see pushService.js, which sends them).
export async function createNotification(userId, type, message, linkScreen = null) {
  const row = await prisma.notification.create({ data: { userId, type, message, linkScreen } });
  kickPushSender();
  return row;
}

export async function notifyMany(userIds, type, message, linkScreen = null) {
  const result = await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type, message, linkScreen })),
  });
  kickPushSender();
  return result;
}
