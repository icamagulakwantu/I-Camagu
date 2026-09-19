// server/controllers/messageController.js
// In-app messaging between mutually-connected Iziduko matches. Every
// function here defers the actual "are these two people allowed to talk"
// check to messageService — this layer is just HTTP plumbing.
import { sendMessage, getConversation, listConversations } from '../services/messageService.js';
import { createNotification } from '../services/notificationDbService.js';
import prisma from '../config/db.js';

export async function listConversationsHandler(req, res) {
  try {
    res.json(await listConversations(req.userId));
  } catch (error) {
    console.error('List conversations error:', error.message);
    res.status(500).json({ error: 'Could not fetch conversations' });
  }
}

export async function getConversationHandler(req, res) {
  try {
    const messages = await getConversation(req.userId, req.params.userId);
    res.json({ messages });
  } catch (error) {
    console.error('Get conversation error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not fetch conversation' });
  }
}

export async function sendMessageHandler(req, res) {
  const { body } = req.body;
  try {
    const message = await sendMessage(req.userId, req.params.userId, body);

    const sender = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true } });
    await createNotification(
      req.params.userId,
      'NEW_MESSAGE',
      `${sender.firstName} ${sender.lastName} sent you a message`,
      'iziduko'
    );

    res.json({ message });
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not send message' });
  }
}
