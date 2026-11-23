import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { addGroup, generateDefaultGroups, getCeremonyGroups, moveGroup, removeGroup, updateGroup } from './hierarchyController.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function call(handler, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); return this; },
    };
    handler(req, res);
  });
}

integrationDescribe('seating and groups (real database)', () => {
  let host; let other; let ceremony;
  beforeAll(async () => {
    host = await prisma.user.create({ data: { email: `seat-${Date.now()}@example.test`, firstName: 'Host', lastName: 'Test', passwordHash: 'x' } });
    other = await prisma.user.create({ data: { email: `seat-other-${Date.now()}@example.test`, firstName: 'Other', lastName: 'Test', passwordHash: 'x' } });
    ceremony = await prisma.ceremony.create({ data: { hostId: host.id, type: 'ULWALUKO', title: 'Umgidi kaLindani' } });
  });
  afterAll(async () => {
    await prisma.ceremony.deleteMany({ where: { hostId: host.id } });
    await prisma.user.deleteMany({ where: { id: { in: [host.id, other.id] } } });
    await prisma.$disconnect();
  });

  it('sets out the groups in order of seniority, each in its place', async () => {
    const r = await call(generateDefaultGroups, { userId: host.id, body: { ceremonyId: ceremony.id } });
    expect(r.status).toBe(201);
    expect(r.body).toHaveLength(14);
    expect(r.body[0]).toMatchObject({ groupLabel: 'Ootata', seatOrder: 1, place: expect.stringMatching(/Ebuhlanti/) });
    expect(r.body.map((g) => g.seatOrder)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    // Again: nothing doubled.
    expect((await call(generateDefaultGroups, { userId: host.id, body: { ceremonyId: ceremony.id } })).body).toHaveLength(14);
  });

  it('only the host changes them', async () => {
    const groups = (await call(getCeremonyGroups, { userId: host.id, params: { ceremonyId: ceremony.id } })).body;
    expect((await call(updateGroup, { userId: other.id, params: { groupId: groups[0].id }, body: { place: 'x' } })).status).toBe(403);
    expect((await call(getCeremonyGroups, { userId: other.id, params: { ceremonyId: ceremony.id } })).status).toBe(403);
  });

  it('changes where a group sits and how many, moves, adds and removes', async () => {
    let groups = (await call(getCeremonyGroups, { userId: host.id, params: { ceremonyId: ceremony.id } })).body;
    const mama = groups.find((g) => g.groupLabel === 'OoMama');
    groups = (await call(updateGroup, { userId: host.id, params: { groupId: mama.id }, body: { place: 'Endlini enkulu, ngasekunene', estimatedSize: '25' } })).body;
    expect(groups.find((g) => g.id === mama.id)).toMatchObject({ place: 'Endlini enkulu, ngasekunene', estimatedSize: 25 });

    const second = groups[1];
    groups = (await call(moveGroup, { userId: host.id, params: { groupId: second.id }, body: { direction: 'up' } })).body;
    expect(groups[0].id).toBe(second.id);
    expect(groups[1].groupLabel).toBe('Ootata');

    groups = (await call(addGroup, { userId: host.id, body: { ceremonyId: ceremony.id, groupLabel: '  Amakhosikazi  ', place: 'Endlini' } })).body;
    expect(groups.at(-1)).toMatchObject({ groupLabel: 'Amakhosikazi', seatOrder: 15 });
    expect((await call(addGroup, { userId: host.id, body: { ceremonyId: ceremony.id, groupLabel: '   ' } })).status).toBe(400);

    groups = (await call(removeGroup, { userId: host.id, params: { groupId: groups[0].id } })).body;
    expect(groups).toHaveLength(14);
    expect(groups.map((g) => g.seatOrder)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });
});
