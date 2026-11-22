// Weekly price checks (see docs/PRICE_CHECK.md).
//
// Each check is a file in server/data/price-checks/, named YYYY-MM-DD.json:
//   { "checkedOn": "2026-11-30",
//     "checks": [ { "name": "...", "bottleFormat": "...",
//                   "bulk": 199.0,            // best special/case price for the whole case
//                   "retail": 263.88,         // regular shelf price x units, or null
//                   "source": "Shop, what was read" } ] }
//
// Every file is applied once, at start-up, with the Bulk Buy rules:
//   - a bulk price only ever moves DOWN; a higher price found is reported,
//     never applied (the founder decides on rises);
//   - retail is recorded only when a shelf price was read, and only if the
//     bulk price is not above it;
//   - an unknown product is skipped (new products are added by hand).
import { readdirSync, readFileSync } from 'node:fs';
import prisma from '../config/db.js';

export const CHECKS_DIR = new URL('../data/price-checks/', import.meta.url);
const FILE = /^\d{4}-\d{2}-\d{2}\.json$/;

export function validateCheckFile(json) {
  const problems = [];
  if (!json || !/^\d{4}-\d{2}-\d{2}$/.test(json.checkedOn || '')) problems.push('checkedOn must be YYYY-MM-DD');
  if (!Array.isArray(json?.checks)) problems.push('checks must be a list');
  (json?.checks || []).forEach((c, i) => {
    const at = `checks[${i}]`;
    if (!c?.name || typeof c.name !== 'string') problems.push(`${at}.name missing`);
    if (typeof c?.bottleFormat !== 'string') problems.push(`${at}.bottleFormat missing`);
    if (!(Number(c?.bulk) > 0)) problems.push(`${at}.bulk must be a positive number`);
    if (c?.retail != null && !(Number(c.retail) > 0)) problems.push(`${at}.retail must be a positive number or null`);
    if (c?.retail != null && Number(c.bulk) > Number(c.retail)) problems.push(`${at}: bulk above retail`);
    if (!c?.source || String(c.source).length < 8) problems.push(`${at}.source must say where the price was read`);
  });
  return problems;
}

export function listCheckFiles(dir = CHECKS_DIR) {
  try {
    return readdirSync(dir).filter((f) => FILE.test(f)).sort();
  } catch {
    return [];
  }
}

export async function applyCheck(json, fixName) {
  if (await prisma.dataFix.findUnique({ where: { name: fixName } })) return { skipped: true };
  const problems = validateCheckFile(json);
  if (problems.length) throw new Error(`${fixName}: ${problems.join('; ')}`);
  const checkedAt = new Date(`${json.checkedOn}T12:00:00Z`);
  const result = { lowered: 0, unchanged: 0, higherFound: [], missing: [], skipped: false };
  const detail = { lowered: [], higherFound: [], unchanged: [], missing: [] };
  for (const c of json.checks) {
    const sku = await prisma.sku.findFirst({ where: { name: c.name, bottleFormat: c.bottleFormat, retiredAt: null } });
    if (!sku) {
      result.missing.push(`${c.name} (${c.bottleFormat})`);
      detail.missing.push({ name: c.name, bottleFormat: c.bottleFormat, source: c.source });
      continue;
    }
    const bulk = Number(c.bulk);
    const retail = c.retail == null ? null : Number(c.retail);
    const current = sku.casePriceZAR != null ? Number(sku.casePriceZAR) : null;
    const data = {};
    const row = { name: c.name, bottleFormat: c.bottleFormat, from: current, found: bulk, retail, source: c.source };
    if (current == null || bulk < current) {
      data.casePriceZAR = bulk;
      result.lowered += 1;
      detail.lowered.push(row);
    } else {
      result.unchanged += 1;
      if (bulk > current) {
        result.higherFound.push(`${c.name} (${c.bottleFormat}): R${current} listed, R${bulk} found`);
        detail.higherFound.push(row);
      } else detail.unchanged.push(row);
    }
    const nextBulk = data.casePriceZAR ?? current;
    if (retail != null && nextBulk != null && nextBulk <= retail) {
      Object.assign(data, { retailPriceZAR: retail, retailPriceSource: 'VERIFIED', retailPriceCheckedAt: checkedAt, retailPriceNote: `Price check ${json.checkedOn}: ${c.source}` });
    }
    if (Object.keys(data).length) await prisma.sku.update({ where: { id: sku.id }, data });
  }
  await prisma.$transaction([
    prisma.dataFix.create({ data: { name: fixName } }),
    prisma.priceCheckRun.create({ data: { file: fixName, checkedOn: json.checkedOn, checked: json.checks.length, lowered: result.lowered, details: JSON.stringify(detail) } }),
  ]);
  return result;
}

export async function applyPriceChecks(dir = CHECKS_DIR) {
  const summary = [];
  for (const file of listCheckFiles(dir)) {
    const fixName = `price-check-${file.replace(/\.json$/, '')}`;
    try {
      const json = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
      const r = await applyCheck(json, fixName);
      if (!r.skipped) {
        console.log(`Price check ${file}: ${r.lowered} lowered, ${r.unchanged} unchanged, ${r.missing.length} not in the catalogue.`);
        if (r.higherFound.length) console.log(`Price check ${file}: higher prices found (not applied): ${r.higherFound.join('; ')}`);
      }
      summary.push({ file, ...r });
    } catch (err) {
      console.error(`Price check ${file} failed:`, err?.message);
      summary.push({ file, error: err?.message });
    }
  }
  return summary;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  applyPriceChecks()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
