import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({
  default: {
    clanGroup: { findMany: vi.fn() },
    isidukoSubmission: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

import prisma from '../config/db.js';
import { matchClan, normaliseIsiduko, searchClans, submitIsidukoForReview } from './clanMatchService.js';

const groups = [
  { id: 'tshawe-id', clanName: 'Tshawe', nationLabel: 'AmaXhosa', aliases: [{ aliasForm: 'Mdange' }] },
  { id: 'zangwa-id', clanName: 'Zangwa', nationLabel: 'AmaXhosa', aliases: [{ aliasForm: 'Khwalo' }] },
  { id: 'zangwe-id', clanName: 'Zangwe', nationLabel: 'AmaXhosa', aliases: [] },
  { id: 'khwemte-id', clanName: 'Khwemte', nationLabel: null, aliases: [] },
  { id: 'cirha-id', clanName: 'Cirha', nationLabel: null, aliases: [] },
];

describe('conservative isiduko matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.clanGroup.findMany.mockResolvedValue(groups);
  });

  it('normalises common nation prefixes and spacing', () => {
    expect(normaliseIsiduko('AmaZangwa')).toBe('zangwa');
    expect(normaliseIsiduko('abaThembu')).toBe('thembu');
    expect(normaliseIsiduko('OoNcibane')).toBe('ncibane');
  });

  it('rejects oversized queries before fuzzy matching', async () => {
    const result = await matchClan('x'.repeat(10000));
    expect(result.results).toEqual([]);
    expect(result.autoSelect).toBe(false);
    expect(result.advice).toContain('120 characters');
    expect(prisma.clanGroup.findMany).not.toHaveBeenCalled();
  });

  it('matches an exact registered praise/alias name to its canonical head', async () => {
    const result = await matchClan('Mdange');
    expect(result.results[0].head).toBe('Tshawe');
    expect(result.results[0].matchedAs).toBe('alias');
    expect(result.autoSelect).toBe(true);
  });

  it('keeps Zangwa and Zangwe separate and flags a vowel-ambiguous spelling', async () => {
    expect((await matchClan('Amazangwa')).results.map((item) => item.head)).toEqual(['Zangwa']);
    expect((await matchClan('Amazangwe')).results.map((item) => item.head)).toEqual(['Zangwe']);
    const fuzzy = await matchClan('Zangwi');
    expect(fuzzy.results.map((item) => item.head).sort()).toEqual(['Zangwa', 'Zangwe']);
    expect(fuzzy.autoSelect).toBe(false);
    expect(fuzzy.results.every((item) => item.possibleDistinct)).toBe(true);
  });

  it('returns fuzzy suggestions only and never auto-selects them', async () => {
    const result = await matchClan('Cira');
    expect(result.results[0].head).toBe('Cirha');
    expect(result.results[0].fuzzy).toBe(true);
    expect(result.autoSelect).toBe(false);
  });

  it('sends unknown text to review without creating a clan group', async () => {
    prisma.isidukoSubmission.findFirst.mockResolvedValue(null);
    prisma.isidukoSubmission.create.mockResolvedValue({ id: 'submission-1', typedText: 'Unlisted Clan', status: 'PENDING_REVIEW' });
    const result = await submitIsidukoForReview({ userId: 'user-1', typedText: 'Unlisted Clan' });
    expect(result.status).toBe('PENDING_REVIEW');
    expect(prisma.clanGroup.findMany).not.toHaveBeenCalled();
    expect(prisma.isidukoSubmission.create).toHaveBeenCalledOnce();
  });
});

describe('clan directory search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.clanGroup.findMany.mockResolvedValue(groups);
  });

  it('lists every clan A-Z with praise names and no sub-group label when nothing is typed', async () => {
    const result = await searchClans('');
    expect(result.results.map((item) => item.head)).toEqual(['Cirha', 'Khwemte', 'Tshawe', 'Zangwa', 'Zangwe']);
    expect(result.results.find((item) => item.head === 'Tshawe').praises).toEqual(['Mdange']);
    expect(result.results.every((item) => !('nation' in item))).toBe(true);
  });

  it('finds a clan from part of a praise name', async () => {
    const result = await searchClans('mda');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ head: 'Tshawe', matchedName: 'Mdange', matchedAs: 'alias' });
  });

  it('lists every clan starting with the typed letters, ignoring the Ama prefix', async () => {
    const result = await searchClans('AmaZang');
    expect(result.results.map((item) => item.head)).toEqual(['Zangwa', 'Zangwe']);
    expect(result.suggestions).toBe(false);
  });

  it('falls back to close spellings when nothing contains the text', async () => {
    const result = await searchClans('Cira');
    expect(result.suggestions).toBe(true);
    expect(result.results[0].head).toBe('Cirha');
  });

  it('respects the result limit but reports the full total', async () => {
    const result = await searchClans('', { limit: 2 });
    expect(result.results).toHaveLength(2);
    expect(result.total).toBe(5);
  });
});
