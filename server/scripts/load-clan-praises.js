// Loads clan praise names (izinqulo) from server/data/clanPraises.json into
// ClanPraise, creating any clan that is not yet in the directory. The file is
// the source of truth for the clans it lists: praises removed from it are
// removed here too (e.g. division labels taken out because every clan sits
// under the one Xhosa banner). Idempotent. A clan is matched to an existing
// one by its normalised name, so "AmaCirha" and "Cirha" stay one clan.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import prisma from '../config/db.js';
import { normaliseIsiduko, clearClanIndexCache } from '../services/clanMatchService.js';
import { isidukoRootKey } from '../../shared/isiduko.js';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'clanPraises.json');

export function readClanPraises() {
  return JSON.parse(readFileSync(DATA, 'utf8')).clans;
}

export async function loadClanPraises(clans = readClanPraises()) {
  const existing = await prisma.clanGroup.findMany({ select: { id: true, clanName: true, aliases: { select: { aliasForm: true } } } });
  const byKey = new Map(existing.map((g) => [normaliseIsiduko(g.clanName), g]));
  // A clan's other recognised spellings (AmaCethe for AmaCete) never open a
  // second entry either.
  for (const g of existing) for (const { aliasForm } of g.aliases) if (!byKey.has(normaliseIsiduko(aliasForm))) byKey.set(normaliseIsiduko(aliasForm), g);
  // Another form of the same clan already registered (Tshawe for AmaTshawe)
  // is the same clan: add the praises there rather than open a second entry.
  const byRoot = new Map(existing.map((g) => [isidukoRootKey(g.clanName), g]));
  let createdClans = 0;
  let addedPraises = 0;
  let removedPraises = 0;
  for (const { clan, praises } of clans) {
    const key = normaliseIsiduko(clan);
    if (!key) continue;
    let group = byKey.get(key) || byRoot.get(isidukoRootKey(clan));
    if (!group) {
      group = await prisma.clanGroup.create({ data: { clanName: clan }, select: { id: true, clanName: true } });
      byKey.set(key, group);
      createdClans += 1;
    }
    const have = new Map((await prisma.clanPraise.findMany({ where: { clanGroupId: group.id } })).map((p) => [p.praise, p]));
    const wanted = new Set(praises.map(([praise]) => praise));
    const stale = [...have.values()].filter((row) => !wanted.has(row.praise)).map((row) => row.id);
    if (stale.length) removedPraises += (await prisma.clanPraise.deleteMany({ where: { id: { in: stale } } })).count;
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
  if (createdClans || addedPraises || removedPraises) {
    clearClanIndexCache();
    console.log(`Clan praises: ${createdClans} clan(s) added, ${addedPraises} praise name(s) added, ${removedPraises} removed.`);
  }
  return { createdClans, addedPraises, removedPraises };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  loadClanPraises()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
