import { getVapidKeys, removeSubscription, saveSubscription } from '../services/pushService.js';

// The public key a phone needs to subscribe. Safe to share.
export async function getPushKey(req, res) {
  try {
    const { publicKey } = await getVapidKeys();
    res.json({ publicKey });
  } catch (err) {
    console.error('Push key unavailable:', err?.message);
    res.status(503).json({ error: 'Phone notifications are not available right now.' });
  }
}

export async function subscribe(req, res) {
  try {
    const saved = await saveSubscription(req.userId, req.body, req.get('user-agent'));
    if (!saved) return res.status(400).json({ error: 'That phone subscription is not valid.' });
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Push subscribe failed:', err?.message);
    return res.status(500).json({ error: 'Could not turn on notifications. Please try again.' });
  }
}

export async function unsubscribe(req, res) {
  try {
    await removeSubscription(req.userId, req.body?.endpoint);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Push unsubscribe failed:', err?.message);
    return res.status(500).json({ error: 'Could not turn off notifications. Please try again.' });
  }
}
