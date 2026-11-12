import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  ceremony: { findUnique: vi.fn() },
  ukusokaEntry: { create: vi.fn() },
};
vi.mock('../config/db.js', () => ({ default: prisma }));

const { addUkusokaEntry } = await import('./ukusokaController.js');

function responseRecorder() {
  return {
    statusCode: 200, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

const ENTRY = { initiateName: 'Lwazi', giverName: 'Malume', itemDescription: 'Blanket', category: 'BLANKET', dateReceived: '2026-11-01' };

async function add(body, userId = 'host-1') {
  const res = responseRecorder();
  await addUkusokaEntry({ body, userId }, res);
  return res;
}

describe('addUkusokaEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.ukusokaEntry.create.mockImplementation(async ({ data }) => ({ id: 'entry-1', ...data }));
  });

  it('links an entry to a ceremony the person hosts', async () => {
    prisma.ceremony.findUnique.mockResolvedValue({ hostId: 'host-1' });
    const res = await add({ ...ENTRY, ceremonyId: 'ceremony-1' });
    expect(res.statusCode).toBe(201);
    expect(prisma.ukusokaEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ceremonyId: 'ceremony-1', recordedById: 'host-1' }) });
  });

  it('refuses to attach an entry to someone else’s ceremony', async () => {
    prisma.ceremony.findUnique.mockResolvedValue({ hostId: 'someone-else' });
    const res = await add({ ...ENTRY, ceremonyId: 'ceremony-2' });
    expect(res.statusCode).toBe(403);
    expect(prisma.ukusokaEntry.create).not.toHaveBeenCalled();
  });

  it('refuses a ceremony that does not exist', async () => {
    prisma.ceremony.findUnique.mockResolvedValue(null);
    const res = await add({ ...ENTRY, ceremonyId: 'missing' });
    expect(res.statusCode).toBe(403);
    expect(prisma.ukusokaEntry.create).not.toHaveBeenCalled();
  });

  it('still records an entry with no ceremony', async () => {
    const res = await add({ ...ENTRY });
    expect(res.statusCode).toBe(201);
    expect(prisma.ceremony.findUnique).not.toHaveBeenCalled();
    expect(prisma.ukusokaEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ceremonyId: null }) });
  });
});
