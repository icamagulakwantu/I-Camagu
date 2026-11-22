import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { getVapidKeys, removeSubscription, saveSubscription, sendPending } from './pushService.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const sub = (n) => ({ endpoint: `https://push.example.test/${n}`, keys: { p256dh: `key-${n}`, auth: `auth-${n}` } });

integrationDescribe('phone notifications (real database)', () => {
  let alice;
  let bongi;
  beforeAll(async () => {
    const stamp = Date.now();
    alice = await prisma.user.create({ data: { email: `push-a-${stamp}@example.test`, firstName: 'Alice', lastName: 'Test', passwordHash: 'x' } });
    bongi = await prisma.user.create({ data: { email: `push-b-${stamp}@example.test`, firstName: 'Bongi', lastName: 'Test', passwordHash: 'x' } });
    await prisma.appSetting.deleteMany({ where: { key: 'vapid-keys' } });
    // Nothing else pending from other tests.
    await prisma.notification.updateMany({ where: { pushedAt: null }, data: { pushedAt: new Date() } });
  });
  afterAll(async () => {
    const ids = [alice.id, bongi.id];
    await prisma.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('makes its keys once and keeps them', async () => {
    const a = await getVapidKeys();
    expect(a.publicKey.length).toBeGreaterThan(40);
    const saved = JSON.parse((await prisma.appSetting.findUnique({ where: { key: 'vapid-keys' } })).value);
    expect(saved.publicKey).toBe(a.publicKey);
  });

  it('refuses a bad subscription and moves a phone to whoever signed in last', async () => {
    expect(await saveSubscription(alice.id, { endpoint: 'http://insecure', keys: { p256dh: 'a', auth: 'b' } })).toBeNull();
    await saveSubscription(alice.id, sub(1));
    await saveSubscription(bongi.id, sub(1));
    expect(await prisma.pushSubscription.count({ where: { endpoint: sub(1).endpoint, userId: bongi.id } })).toBe(1);
    expect(await removeSubscription(alice.id, sub(1).endpoint)).toBe(0);
    await saveSubscription(alice.id, sub(2));
    await saveSubscription(alice.id, sub(3));
  });

  it('sends each fresh notification once, skips old ones, drops dead phones', async () => {
    await prisma.notification.create({ data: { userId: alice.id, type: 'TEST', message: 'Old news', createdAt: new Date(Date.now() - 60 * 60 * 1000) } });
    await prisma.notification.create({ data: { userId: alice.id, type: 'TEST', message: 'Your order is ready', linkScreen: 'myorders' } });
    const calls = [];
    const send = async (target, payload) => {
      calls.push({ endpoint: target.endpoint, payload: JSON.parse(payload) });
      if (target.endpoint.endsWith('/3')) { const e = new Error('gone'); e.statusCode = 410; throw e; }
    };
    const r = await sendPending({ send });
    expect(r).toEqual({ notifications: 1, sent: 1, removed: 1 });
    expect(calls.map((c) => c.endpoint).sort()).toEqual([sub(2).endpoint, sub(3).endpoint]);
    expect(calls[0].payload).toMatchObject({ body: 'Your order is ready', url: '/smartmatch/orders' });
    expect(await prisma.pushSubscription.count({ where: { endpoint: sub(3).endpoint } })).toBe(0);
    expect(await sendPending({ send })).toEqual({ notifications: 0, sent: 0, removed: 0 });
  });
});
