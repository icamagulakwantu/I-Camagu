// Loads clan praise names (izinqulo) from server/data/clanPraises.json into
// ClanPraise, creating any clan that is not yet in the directory. Idempotent:
// existing praises are kept (a higher source count is updated), nothing is
// deleted, and a clan is matched to an existing one by its normalised name,
// so "AmaCirha" and "Cirha" stay one clan.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import prisma from '../config/db.js';
import { normaliseIsiduko, clearClanIndexCache } from '../services/clanMatchService.js';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'clanPraises.json');

export function readClanPraises() {
  return JSON.parse(readFileSync(DATA, 'utf8')).clans;
}

export async function loadClanPraises(clans = readClanPraises()) {
  const existing = await prisma.clanGroup.findMany({ select: { id: true, clanName: true } });
  const byKey = new Map(existing.map((g) => [normaliseIsiduko(g.clanName), g]));
  let createdClans = 0;
  let addedPraises = 0;
  for (const { clan, praises } of clans) {
    const key = normaliseIsiduko(clan);
    if (!key) continue;
    let group = byKey.get(key);
    if (!group) {
      group = await prisma.clanGroup.create({ data: { clanName: clan }, select: { id: true, clanName: true } });
      byKey.set(key, group);
      createdClans += 1;
    }
    const have = new Map((await prisma.clanPraise.findMany({ where: { clanGroupId: group.id } })).map((p) => [p.praise, p]));
    for (const [praise, sourceCount] of praises) {
      const row = have.get(praise);
      if (!row) {
        await prisma.clanPraise.create({ data: { clanGroupId: group.id, praise, sourceCount } });
        addedPraises += 1;
      } else if (row.sourceCount < sourceCount) {
        await prisma.clanPraise.update({ where: { id: row.id }, data: { sourceCount } });
      }
    }
  }
  if (createdClans || addedPraises) {
    clearClanIndexCache();
    console.log(`Clan praises: ${createdClans} clan(s) added, ${addedPraises} praise name(s) added.`);
  }
  return { createdClans, addedPraises };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  loadClanPraises()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
