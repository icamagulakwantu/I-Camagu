import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { rsvp, attendance } from './attendanceController.js';
import { getCommunityFeed } from '../services/poolDiscoveryService.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function call(handler, req) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { resolve({ status: this.statusCode, body }); } };
    handler({ params: {}, body: {}, ...req }, res);
  });
}

integrationDescribe('ceremony RSVP (real database)', () => {
  let host; let cousin; let stranger; let ceremony;
  const day = 86400000;
  beforeAll(async () => {
    const mk = (first, clan) => prisma.user.create({ data: { email: `${first}-${randomUUID()}@example.invalid`, firstName: first, lastName: 'Test', paternalIziduko: clan } });
    host = await mk('Asi', 'Zzrsvpclan'); cousin = await mk('Sipho', 'Zzrsvpclan'); stranger = await mk('Other', 'Zzotherclan');
    // He went in 10 days ago; umgidi is in 3 weeks.
    ceremony = await prisma.ceremony.create({ data: { hostId: host.id, type: 'ULWALUKO', title: 'Ulwaluko kaSoso', visibility: 'CLAN_ONLY', eventDate: new Date(Date.now() - 10 * day), homecomingDate: new Date(Date.now() + 21 * day) } });
  });
  afterAll(async () => {
    const ids = [host.id, cousin.id, stranger.id];
    await prisma.ceremonyAttendance.deleteMany({ where: { ceremonyId: ceremony.id } });
    await prisma.ceremony.delete({ where: { id: ceremony.id } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('shows the umgidi to the clan until homecoming, not to others', async () => {
    const mine = (await getCommunityFeed(cousin.id)).upcomingClanCeremonies.find((c) => c.id === ceremony.id);
    expect(mine).toMatchObject({ title: 'Umgidi · Ulwaluko kaSoso', myRsvp: null, isMine: false });
    expect((await getCommunityFeed(stranger.id)).upcomingClanCeremonies.find((c) => c.id === ceremony.id)).toBeUndefined();
  });

  it('a clan member confirms; a stranger cannot', async () => {
    expect((await call(rsvp, { userId: cousin.id, params: { id: ceremony.id }, body: { coming: true, guests: 3 } })).body).toEqual({ coming: true, guests: 3 });
    expect((await call(rsvp, { userId: stranger.id, params: { id: ceremony.id }, body: { coming: true } })).status).toBe(404);
    expect(await prisma.notification.count({ where: { userId: host.id, type: 'CEREMONY_RSVP' } })).toBe(1);
    expect((await getCommunityFeed(cousin.id)).upcomingClanCeremonies.find((c) => c.id === ceremony.id).myRsvp).toEqual({ coming: true, guests: 3 });
  });

  it('only the host sees who is coming', async () => {
    const list = await call(attendance, { userId: host.id, params: { id: ceremony.id } });
    expect(list.body).toMatchObject({ people: 3, notComing: 0 });
    expect(list.body.coming[0]).toMatchObject({ name: 'Sipho Test', clan: 'Zzrsvpclan', guests: 3 });
    expect((await call(attendance, { userId: cousin.id, params: { id: ceremony.id } })).status).toBe(403);
  });

  it('changing your mind updates the count without a second notification', async () => {
    await call(rsvp, { userId: cousin.id, params: { id: ceremony.id }, body: { coming: false } });
    expect((await call(attendance, { userId: host.id, params: { id: ceremony.id } })).body).toMatchObject({ people: 0, notComing: 1 });
    expect(await prisma.notification.count({ where: { userId: host.id, type: 'CEREMONY_RSVP' } })).toBe(1);
  });
});
