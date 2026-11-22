// Phone notifications (Web Push).
//
// Every in-app notification is a row in Notification, created all over the
// server (some inside transactions). Rather than touch each of those places,
// a small sender picks up new rows and sends each one, once, to every phone
// its person turned notifications on for. It runs every few seconds and is
// also nudged straight after createNotification, so most arrive at once.
//
// Keys: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY from the environment if set;
// otherwise a pair is generated on first run and kept in AppSetting, so the
// feature works without any setup and phones stay subscribed across deploys.
import webpush from 'web-push';
import prisma from '../config/db.js';
import { SCREEN_PATHS } from '../../shared/screenPaths.js';

const KEY_SETTING = 'vapid-keys';
// Only notifications this fresh are sent: older ones (and everything created
// before phone notifications existed) stay in the app list only.
const FRESH_MINUTES = 15;
const BATCH = 50;
const INTERVAL_MS = 5000;

let keysPromise = null;
let timer = null;
let running = false;
let again = false;

export function pushPathFor(linkScreen) {
  return (linkScreen && SCREEN_PATHS[linkScreen]) || SCREEN_PATHS.notifications;
}

export function pushPayload(notification) {
  return JSON.stringify({
    title: 'i-Camagu',
    body: String(notification.message || '').slice(0, 240),
    url: pushPathFor(notification.linkScreen),
    tag: notification.id,
  });
}

async function loadKeys() {
  const fromEnv = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  if (fromEnv.publicKey && fromEnv.privateKey) return fromEnv;
  const existing = await prisma.appSetting.findUnique({ where: { key: KEY_SETTING } });
  if (existing) return JSON.parse(existing.value);
  const fresh = webpush.generateVAPIDKeys();
  // Two servers starting together: the first write wins and both read it back.
  await prisma.appSetting.createMany({ data: [{ key: KEY_SETTING, value: JSON.stringify(fresh) }], skipDuplicates: true });
  const saved = await prisma.appSetting.findUnique({ where: { key: KEY_SETTING } });
  return JSON.parse(saved.value);
}

export async function getVapidKeys() {
  if (!keysPromise) keysPromise = loadKeys().catch((err) => { keysPromise = null; throw err; });
  return keysPromise;
}

function subject() {
  const configured = process.env.VAPID_SUBJECT || process.env.APP_URL || '';
  if (/^(mailto:|https:\/\/)/.test(configured)) return configured;
  return 'https://i-camagu.co.za';
}

export async function saveSubscription(userId, body, userAgent) {
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : '';
  const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth : '';
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000 || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
    return null;
  }
  const ua = userAgent ? String(userAgent).slice(0, 300) : null;
  // A phone belongs to whoever signed in on it last.
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth, userAgent: ua },
    update: { userId, p256dh, auth, userAgent: ua },
  });
}

export async function removeSubscription(userId, endpoint) {
  if (typeof endpoint !== 'string' || !endpoint) return 0;
  const r = await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  return r.count;
}

// Claim fresh, unsent notifications so each is sent exactly once, even with
// more than one server running.
async function claimBatch() {
  return prisma.$queryRaw`
    UPDATE "Notification" SET "pushedAt" = NOW()
    WHERE "id" IN (
      SELECT "id" FROM "Notification"
      WHERE "pushedAt" IS NULL AND "createdAt" > NOW() - (${FRESH_MINUTES} * INTERVAL '1 minute')
      ORDER BY "createdAt" ASC
      LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "userId", "message", "linkScreen"`;
}

export async function sendPending({ send = webpush.sendNotification } = {}) {
  const claimed = await claimBatch();
  if (!claimed.length) return { notifications: 0, sent: 0, removed: 0 };
  const keys = await getVapidKeys();
  const options = { vapidDetails: { subject: subject(), publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 60 * 60 * 24, urgency: 'normal' };
  const userIds = [...new Set(claimed.map((n) => n.userId))];
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  let sent = 0;
  const gone = [];
  const used = [];
  for (const n of claimed) {
    const payload = pushPayload(n);
    for (const sub of subs.filter((s) => s.userId === n.userId)) {
      try {
        await send({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, options);
        sent += 1;
        used.push(sub.id);
      } catch (err) {
        // 404/410: the phone turned notifications off or the app was removed.
        if (err?.statusCode === 404 || err?.statusCode === 410) gone.push(sub.id);
        else console.error('Phone notification failed:', err?.statusCode || err?.message);
      }
    }
  }
  if (gone.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  if (used.length) await prisma.pushSubscription.updateMany({ where: { id: { in: [...new Set(used)] } }, data: { lastUsedAt: new Date() } });
  return { notifications: claimed.length, sent, removed: gone.length };
}

async function drain() {
  if (running) { again = true; return; }
  running = true;
  try {
    do {
      again = false;
      // eslint-disable-next-line no-await-in-loop
      const r = await sendPending();
      if (r.notifications === BATCH) again = true;
    } while (again);
  } catch (err) {
    console.error('Phone notification sender failed:', err?.message);
  } finally {
    running = false;
  }
}

// Nudge the sender (called after a notification is created).
export function kickPushSender() {
  if (!timer) return;
  setTimeout(drain, 250);
}

export function startPushSender() {
  if (timer || process.env.DISABLE_PUSH === 'true') return;
  timer = setInterval(drain, INTERVAL_MS);
  timer.unref?.();
  drain();
}

export function stopPushSender() {
  if (timer) clearInterval(timer);
  timer = null;
}
