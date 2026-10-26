// FIN-03: compares every stokvel's stored group balance with its books.
//   node server/scripts/check-balances.js
// Read-only: it changes nothing. Exits with code 1 if any stokvel does not
// match, so a deploy step or a person can notice. Older stokvels whose money
// moved before the books existed will show a difference; an official must
// review those and post a correcting OPENING_BALANCE entry, never edit rows.
import 'dotenv/config';
import prisma from '../config/db.js';
import { checkStokvelBalance } from '../services/ledgerService.js';

const BATCH = 200;
let cursor;
let checked = 0;
const mismatches = [];

try {
  for (;;) {
    const rows = await prisma.stokvelGroupLedger.findMany({
      select: { stokvelId: true },
      orderBy: { stokvelId: 'asc' },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { stokvelId: cursor } } : {}),
    });
    if (rows.length === 0) break;
    for (const { stokvelId } of rows) {
      const result = await checkStokvelBalance(stokvelId);
      checked += 1;
      if (!result.agrees) mismatches.push({ stokvelId, ...result });
    }
    cursor = rows[rows.length - 1].stokvelId;
  }
} finally {
  await prisma.$disconnect().catch(() => {});
}

for (const m of mismatches) {
  console.log(`MISMATCH ${m.stokvelId}: ${m.message} (stored ${m.storedCents}c, books ${m.bookBankCents}c)`);
}
console.log(`Checked ${checked} stokvel(s): ${mismatches.length} mismatch(es).`);
if (mismatches.length) process.exit(1);
