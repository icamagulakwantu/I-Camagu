import {
  findClanMatches,
  sendClanConnectionRequest,
  respondToClanConnectionRequest,
  withdrawClanConnectionRequest,
  getClanConnectionRequests,
  getClanConnections,
  getConnectionStatusesForUsers,
} from '../services/izidukoService.js';
import { createNotification } from '../services/notificationDbService.js';
import prisma from '../config/db.js';

export async function getMyClanMatches(req, res) {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const profileComplete = !!(
      me.paternalIziduko &&
      me.maternalIziduko &&
      me.paternalGrandmotherIziduko &&
      me.maternalGrandmotherIziduko &&
      me.profileImage
    );

    if (!profileComplete) {
      return res.json({
        profileComplete: false,
        matches: [],
        message: 'Complete your four ancestral Isiduko fields and add a profile photo before viewing clan member profiles.',
      });
    }

    const rawMatches = await findClanMatches(req.userId);
    const statusMap = await getConnectionStatusesForUsers(req.userId, rawMatches.map((m) => m.id));

    const ranked = rawMatches.map((other) => {
      const matchedCount = other.matchedLines.length;
      let tier = 5;
      let label = 'Potential ancestral connection';
      if (other.sameSurname && matchedCount >= 4) {
        tier = 1;
        label = 'Strong ancestral connection — shared four Isiduko lines & surname';
      } else if (other.sameSurname && matchedCount >= 2) {
        tier = 2;
        label = 'Strong ancestral connection — shared Isiduko lines & surname';
      } else if (matchedCount >= 3) {
        tier = 2;
        label = 'Multiple ancestral Isiduko connections';
      } else if (matchedCount === 2) {
        tier = 3;
        label = 'Shares two ancestral Isiduko lines';
      } else if (other.sameSurname) {
        tier = 4;
        label = 'Same surname — potential connection';
      } else {
        tier = 5;
        label = 'Shares an Isiduko line';
      }

      const connection = statusMap[other.id] || { status: 'none', connectionId: null };
      return { ...other, tier, label, connectionStatus: connection.status, connectionId: connection.connectionId };
    }).sort((a, b) => a.tier - b.tier);

    res.json({ profileComplete: true, matches: ranked });
  } catch (error) {
    console.error('Get clan matches error:', error.message);
    res.status(500).json({ error: 'Could not fetch clan matches' });
  }
}

export async function connectWithMatch(req, res) {
  const { recipientId, message } = req.body;
  if (!recipientId) return res.status(400).json({ error: 'recipientId is required' });

  try {
    const { connection, mutual } = await sendClanConnectionRequest(req.userId, recipientId, message);

    if (mutual) {
      await createNotification(recipientId, 'CLAN_CONNECTION_ACCEPTED', 'You both wanted to connect — it\'s a match!', 'iziduko');
      await createNotification(req.userId, 'CLAN_CONNECTION_ACCEPTED', 'You both wanted to connect — it\'s a match!', 'iziduko');
    } else if (connection.status === 'PENDING') {
      const requester = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true } });
      await createNotification(recipientId, 'CLAN_CONNECTION_REQUEST', `${requester.firstName} ${requester.lastName} wants to connect through your Iziduko`, 'iziduko');
    }

    res.json({ connection });
  } catch (error) {
    console.error('Send clan connection error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not send connection request' });
  }
}

export async function respondToConnectionRequest(req, res) {
  const { accept } = req.body;
  try {
    const connection = await respondToClanConnectionRequest(req.params.id, req.userId, !!accept);
    if (accept) {
      await createNotification(connection.requesterId, 'CLAN_CONNECTION_ACCEPTED', 'Your clan connection request was accepted', 'iziduko');
    }
    res.json({ connection });
  } catch (error) {
    console.error('Respond to clan connection error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not respond to request' });
  }
}

export async function withdrawConnectionRequest(req, res) {
  try {
    await withdrawClanConnectionRequest(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Withdraw clan connection error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not withdraw request' });
  }
}

export async function listConnectionRequests(req, res) {
  try {
    const requests = await getClanConnectionRequests(req.userId);
    res.json(requests);
  } catch (error) {
    console.error('List clan connection requests error:', error.message);
    res.status(500).json({ error: 'Could not fetch connection requests' });
  }
}

export async function listConnections(req, res) {
  try {
    const connections = await getClanConnections(req.userId);
    res.json({ connections });
  } catch (error) {
    console.error('List clan connections error:', error.message);
    res.status(500).json({ error: 'Could not fetch connections' });
  }
}
