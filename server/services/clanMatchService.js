import prisma from '../config/db.js';

export function normaliseIsiduko(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/^(?:abakwa|akwa|ama|aba|abe|oo|o)\s*/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function consonantSkeleton(value) {
  return normaliseIsiduko(value).replace(/[aeiou]/g, '');
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

let clanIndexCache = null;
let clanIndexCachedAt = 0;
const CLAN_INDEX_TTL_MS = 30_000;

export async function buildClanIndex({ forceRefresh = false } = {}) {
  if (!forceRefresh && clanIndexCache && Date.now() - clanIndexCachedAt < CLAN_INDEX_TTL_MS) return clanIndexCache;
  const groups = await prisma.clanGroup.findMany({
    include: { aliases: true },
    orderBy: { clanName: 'asc' },
  });
  clanIndexCache = groups.map((group) => ({
    id: group.id,
    head: group.clanName,
    display: group.clanName,
    nation: group.nationLabel || null,
    names: [
      { label: group.clanName, kind: 'head' },
      ...group.aliases.map((alias) => ({ label: alias.aliasForm, kind: 'alias' })),
    ],
  }));
  clanIndexCachedAt = Date.now();
  return clanIndexCache;
}

export function clearClanIndexCache() {
  clanIndexCache = null;
  clanIndexCachedAt = 0;
}

export async function matchClan(query) {
  const rawQuery = String(query || '').trim();
  if (rawQuery.length > 120) {
    return {
      query: rawQuery.slice(0, 120),
      normalised: '',
      results: [],
      ambiguous: false,
      autoSelect: false,
      advice: 'Keep the clan or praise name under 120 characters.',
    };
  }
  const q = rawQuery;
  const normalised = normaliseIsiduko(q);
  if (normalised.length < 2) {
    return { query: q, normalised, results: [], ambiguous: false, autoSelect: false, advice: 'Type at least two letters to search.' };
  }

  const index = await buildClanIndex();
  const exact = [];
  for (const clan of index) {
    const match = clan.names.find((name) => normaliseIsiduko(name.label) === normalised);
    if (match) exact.push({ id: clan.id, head: clan.head, display: clan.display, nation: clan.nation, matchedName: match.label, matchedAs: match.kind, fuzzy: false, possibleDistinct: false });
  }
  if (exact.length) {
    return {
      query: q,
      normalised,
      results: exact,
      ambiguous: exact.length > 1,
      autoSelect: exact.length === 1,
      advice: exact.length > 1 ? 'This name is shared. Choose the clan that matches your family.' : 'Choose to confirm this clan identity.',
    };
  }

  const suggestions = [];
  for (const clan of index) {
    let best = Infinity;
    let matchedName = clan.head;
    for (const name of clan.names) {
      const candidate = normaliseIsiduko(name.label);
      const distance = editDistance(normalised, candidate);
      if (distance < best) { best = distance; matchedName = name.label; }
    }
    const possibleDistinct = normalised !== normaliseIsiduko(matchedName)
      && consonantSkeleton(normalised) === consonantSkeleton(matchedName);
    if (possibleDistinct || (best <= (normalised.length >= 7 ? 2 : 1))) {
      suggestions.push({
        id: clan.id,
        head: clan.head,
        display: clan.display,
        nation: clan.nation,
        matchedName,
        matchedAs: matchedName === clan.head ? 'head' : 'alias',
        fuzzy: true,
        possibleDistinct,
        distance: best,
      });
    }
  }
  suggestions.sort((a, b) => Number(b.possibleDistinct) - Number(a.possibleDistinct) || a.distance - b.distance || a.head.localeCompare(b.head));
  const results = suggestions.slice(0, 8);
  return {
    query: q,
    normalised,
    results,
    ambiguous: results.length > 1 || results.some((item) => item.possibleDistinct),
    autoSelect: false,
    advice: results.length
      ? 'These are suggestions only. Check the spelling and choose the clan yourself.'
      : 'No registered clan matches this text. You can submit it for community review.',
  };
}

function praiseNamesFor(clan) {
  return [...new Set(
    clan.names
      .filter((name) => name.kind === 'alias')
      .map((name) => String(name.label || '').trim())
      .filter((label) => label && label !== clan.head),
  )];
}

function toSearchResult(clan, matched) {
  return {
    id: clan.id,
    head: clan.head,
    praises: praiseNamesFor(clan),
    matchedName: matched.label,
    matchedAs: matched.kind,
  };
}

// Search-as-you-type for the "Find your clan" directory. Unlike matchClan
// (which confirms one identity), this lists every clan whose name or praise
// name contains the typed text, like the Bulk Buy search. All clans sit under
// the one Xhosa umbrella, so no sub-group label is returned.
export async function searchClans(query, { limit = 40 } = {}) {
  const rawQuery = String(query || '').trim().slice(0, 120);
  const q = normaliseIsiduko(rawQuery);
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 40, 1), 100);
  const index = await buildClanIndex();

  const found = [];
  for (const clan of index) {
    if (!q) {
      found.push({ rank: 3, result: toSearchResult(clan, clan.names[0]) });
      continue;
    }
    let best = null;
    for (const name of clan.names) {
      const candidate = normaliseIsiduko(name.label);
      const rank = candidate === q ? 0 : candidate.startsWith(q) ? 1 : candidate.includes(q) ? 2 : -1;
      if (rank >= 0 && (!best || rank < best.rank)) best = { rank, name };
    }
    if (best) found.push({ rank: best.rank, result: toSearchResult(clan, best.name) });
  }
  found.sort((a, b) => a.rank - b.rank || a.result.head.localeCompare(b.result.head));

  // Nothing contains the text: fall back to close spellings (e.g. "Cira" -> Cirha)
  if (found.length === 0 && q.length >= 2) {
    const fuzzy = await matchClan(rawQuery);
    const byId = new Map(index.map((clan) => [clan.id, clan]));
    const results = fuzzy.results
      .map((item) => byId.get(item.id))
      .filter(Boolean)
      .map((clan) => toSearchResult(clan, clan.names[0]));
    return { query: rawQuery, total: results.length, suggestions: results.length > 0, results: results.slice(0, safeLimit) };
  }

  return {
    query: rawQuery,
    total: found.length,
    suggestions: false,
    results: found.slice(0, safeLimit).map((item) => item.result),
  };
}

export async function submitIsidukoForReview({ userId, typedText, nationLabel }) {
  const text = String(typedText || '').trim();
  const normalisedText = normaliseIsiduko(text);
  if (text.length < 2 || text.length > 120) throw new Error('Enter a clan name or praise name between 2 and 120 characters');
  if (normalisedText.length < 2) throw new Error('Enter a valid clan name or praise name');
  const existing = await prisma.isidukoSubmission.findFirst({
    where: { userId, normalisedText, status: 'PENDING_REVIEW' },
    select: { id: true },
  });
  if (existing) return { id: existing.id, duplicate: true, status: 'PENDING_REVIEW' };
  return prisma.isidukoSubmission.create({
    data: {
      userId,
      typedText: text,
      normalisedText,
      nationLabel: typeof nationLabel === 'string' ? nationLabel.trim().slice(0, 80) || null : null,
    },
    select: { id: true, typedText: true, status: true, createdAt: true },
  });
}
