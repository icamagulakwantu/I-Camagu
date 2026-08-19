import prisma from '../config/db.js';

export async function createNotification(userId, type, message, linkScreen = null) {
      return prisma.notification.create({ data: { userId, type, message, linkScreen } });
}

export async function notifyMany(userIds, type, message, linkScreen = null) {
      return prisma.notification.createMany({
              data: userIds.map(userId => ({ userId, type, message, linkScreen })),
      });
}