import prisma from '../config/db.js';

export async function getMyNotifications(req, res) {
      try {
              const notifications = await prisma.notification.findMany({
                        where: { userId: req.userId },
                              orderBy: { createdAt: 'desc' },
                                    take: 30,
              });
                  res.json(notifications);
      } catch (error) {
              res.status(500).json({ error: 'Could not fetch notifications' });
      }
}

export async function getUnreadCount(req, res) {
      try {
              const count = await prisma.notification.count({ where: { userId: req.userId, isRead: false } });
                  res.json({ count });
      } catch (error) {
              res.status(500).json({ error: 'Could not fetch count' });
      }
}

export async function markAsRead(req, res) {
      const { notificationId } = req.params;
        try {
                const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
                    if (!notif || notif.userId !== req.userId) return res.status(403).json({ error: 'Not your notification' });
                        await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
                            res.json({ message: 'Marked as read' });
        } catch (error) {
                res.status(500).json({ error: 'Could not update notification' });
        }
}

export async function markAllRead(req, res) {
      try {
              await prisma.notification.updateMany({ where: { userId: req.userId, isRead: false }, data: { isRead: true } });
                  res.json({ message: 'All marked as read' });
      } catch (error) {
              res.status(500).json({ error: 'Could not update notifications' });
      }
}