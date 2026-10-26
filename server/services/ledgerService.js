import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import {
  GENESIS_HASH, LedgerError, validateLines, assertDistinctDuties, negateLines, computeEntryHash, verifyEntries,
} from '../utils/ledgerRules.js';
import { fromCents } from '../utils/money.js';
import { bankDeltaCents, summariseBalanceCheck } from '../utils/balanceRules.js';

// The stokvel ledger. I-Camagu RECORDS money movements here; it never holds,
// lends or transfers the money. Rows are append-only: the database itself
// refuses to change or delete them, and each entry carries a hash of the one
// before it, so any later tampering shows up when the chain is verified.

async function createTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LedgerEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "stokvelId" TEXT NOT NULL,
      "seq" INTEGER NOT NULL,
      "kind" TEXT NOT NULL,
      "memo" TEXT,
      "idempotencyKey" TEXT NOT NULL,
      "reversesEntryId" TEXT,
      "createdById" TEXT NOT NULL,
      "approvedById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL,
      "prevHash" TEXT NOT NULL,
      "hash" TEXT NOT NULL
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LedgerLine" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "entryId" TEXT NOT NULL,
      "stokvelId" TEXT NOT NULL,
      "account" TEXT NOT NULL,
      "amountCents" BIGINT NOT NULL
    );
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEntry_stokvel_seq_key" ON "LedgerEntry" ("stokvelId", "seq");');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEntry_stokvel_idem_key" ON "LedgerEntry" ("stokvelId", "idempotencyKey");');
  // An entry can be reversed once and only once.
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEntry_reverses_key" ON "LedgerEntry" ("reversesEntryId") WHERE "reversesEntryId" IS NOT NULL;');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LedgerLine_entryId_idx" ON "LedgerLine" ("entryId");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LedgerLine_stokvel_account_idx" ON "LedgerLine" ("stokvelId", "account");');
  // Database-level protection: even a bug or a careless script cannot edit history.
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION ledger_block_change() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'Ledger records cannot be changed or deleted. Post a reversal instead.';
    END;
    $$ LANGUAGE plpgsql;
  `);
  for (const table of ['LedgerEntry', 'LedgerLine']) {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${table}_immutable') THEN
          CREATE TRIGGER "${table}_immutable" BEFORE UPDATE OR DELETE ON "${table}"
          FOR EACH ROW EXECUTE FUNCTION ledger_block_change();
        END IF;
      END $$;
    `);
  }
}

let tablesReady = null;
export function ensureLedgerTables() {
  if (!tablesReady) tablesReady = createTables().catch((err) => { tablesReady = null; throw err; });
  return tablesReady;
}

// One writer per stokvel at a time, so sequence numbers and the hash chain
// never fork. Money flows take this lock FIRST, before touching any balance
// row, so every transaction acquires locks in the same order (no deadlocks).
// Postgres advisory locks are re-entrant inside one transaction.
export async function lockStokvelLedger(tx, stokvelId) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${stokvelId}))`;
}

// Records one balanced entry inside the CALLER's transaction, so the books
// entry and the balance change it describes commit or roll back together.
// Call ensureLedgerTables() before opening the transaction.
// Safe to call twice with the same idempotencyKey: the second call returns
// the first entry instead of counting the money again.
export async function postEntryTx(tx, {
  stokvelId, kind, memo = null, lines, idempotencyKey, createdById, approvedById = null, reversesEntryId = null,
}) {
  if (!stokvelId || !kind || !idempotencyKey || !createdById) throw new LedgerError('Missing entry details');
  validateLines(lines);
  assertDistinctDuties({ createdById, approvedById });

  await lockStokvelLedger(tx, stokvelId);

  const existing = await tx.$queryRaw`
    SELECT "id", "seq", "hash" FROM "LedgerEntry" WHERE "stokvelId" = ${stokvelId} AND "idempotencyKey" = ${idempotencyKey}`;
  if (existing.length) return { id: existing[0].id, seq: existing[0].seq, hash: existing[0].hash, duplicate: true };

  const last = await tx.$queryRaw`
    SELECT "seq", "hash" FROM "LedgerEntry" WHERE "stokvelId" = ${stokvelId} ORDER BY "seq" DESC LIMIT 1`;
  const seq = (last[0]?.seq ?? 0) + 1;
  const prevHash = last[0]?.hash ?? GENESIS_HASH;
  const createdAt = new Date();
  const id = randomUUID();
  const hash = computeEntryHash({
    prevHash, stokvelId, seq, kind, memo, createdById, approvedById, reversesEntryId,
    createdAt: createdAt.toISOString(), lines,
  });

  await tx.$executeRaw`
    INSERT INTO "LedgerEntry" ("id", "stokvelId", "seq", "kind", "memo", "idempotencyKey", "reversesEntryId",
      "createdById", "approvedById", "createdAt", "prevHash", "hash")
    VALUES (${id}, ${stokvelId}, ${seq}, ${kind}, ${memo}, ${idempotencyKey}, ${reversesEntryId},
      ${createdById}, ${approvedById}, ${createdAt}, ${prevHash}, ${hash})`;
  for (const line of lines) {
    await tx.$executeRaw`
      INSERT INTO "LedgerLine" ("id", "entryId", "stokvelId", "account", "amountCents")
      VALUES (${randomUUID()}, ${id}, ${stokvelId}, ${line.account}, ${line.amountCents})`;
  }
  return { id, seq, hash, duplicate: false };
}

// FIN-03: the books are the official record; StokvelGroupLedger.totalBalance
// is a quick-read copy of the books' BANK account. This posts the entry AND
// moves the stored balance by the entry's BANK amount, in the caller's
// transaction, so the two can never drift apart.
//
// With requireFunds, money only leaves if the stored balance still covers it
// (checked in the same statement). If not, nothing is changed here and
// { fundsShort: true } is returned: the caller MUST throw to roll back the
// books entry already written in this transaction.
// A repeated idempotencyKey changes nothing (the money was already counted).
export async function postEntryWithBalanceTx(tx, entry, { requireFunds = false } = {}) {
  const posted = await postEntryTx(tx, entry);
  if (posted.duplicate) return posted;

  const deltaCents = bankDeltaCents(entry.lines);
  if (deltaCents === 0) return posted;
  const amount = fromCents(Math.abs(deltaCents));
  const { stokvelId } = entry;

  if (deltaCents > 0) {
    const updated = await tx.stokvelGroupLedger.updateMany({
      where: { stokvelId },
      data: { totalBalance: { increment: amount } },
    });
    if (updated.count === 0) await tx.stokvelGroupLedger.create({ data: { stokvelId, totalBalance: amount } });
    return posted;
  }

  const where = requireFunds ? { stokvelId, totalBalance: { gte: amount } } : { stokvelId };
  const updated = await tx.stokvelGroupLedger.updateMany({ where, data: { totalBalance: { decrement: amount } } });
  if (updated.count === 0) {
    if (requireFunds) return { ...posted, fundsShort: true };
    throw new LedgerError('This stokvel has no stored group balance yet');
  }
  return posted;
}

// FIN-03: compares the stored balance with the books' BANK total. Both are
// read in ONE statement, so they come from the same moment in time.
export async function checkStokvelBalance(stokvelId) {
  await ensureLedgerTables();
  const rows = await prisma.$queryRaw`
    SELECT
      (SELECT "totalBalance"::text FROM "StokvelGroupLedger" WHERE "stokvelId" = ${stokvelId}) AS stored,
      (SELECT COALESCE(SUM("amountCents"), 0)::bigint FROM "LedgerLine"
        WHERE "stokvelId" = ${stokvelId} AND "account" = 'BANK') AS bank`;
  return summariseBalanceCheck({ storedText: rows[0]?.stored ?? null, bookBankCents: Number(rows[0]?.bank ?? 0) });
}

// Records one balanced entry in its own transaction. Use postEntryTx instead
// whenever the entry describes a balance change made in the same request.
export async function postEntry(entry) {
  await ensureLedgerTables();
  return prisma.$transaction((tx) => postEntryTx(tx, entry));
}

// Mistakes are corrected by a linked reversal with a stated reason, never by editing.
export async function reverseEntry({ stokvelId, entryId, reason, createdById, approvedById = null }) {
  const why = String(reason || '').trim();
  if (why.length < 5) throw new LedgerError('Give a reason for the reversal');
  await ensureLedgerTables();
  const rows = await prisma.$queryRaw`
    SELECT "id", "kind", "reversesEntryId" FROM "LedgerEntry" WHERE "id" = ${entryId} AND "stokvelId" = ${stokvelId}`;
  if (!rows.length) throw new LedgerError('Entry not found');
  if (rows[0].reversesEntryId) throw new LedgerError('A reversal cannot itself be reversed. Post a new correcting entry instead');
  const lines = await prisma.$queryRaw`
    SELECT "account", "amountCents" FROM "LedgerLine" WHERE "entryId" = ${entryId}`;
  const original = lines.map((l) => ({ account: l.account, amountCents: Number(l.amountCents) }));
  // FIN-03: the reversal and the matching stored-balance change are one transaction.
  return prisma.$transaction((tx) => postEntryWithBalanceTx(tx, {
    stokvelId, kind: 'REVERSAL', memo: `Reversal: ${why}`, lines: negateLines(original),
    idempotencyKey: `reversal:${entryId}`, createdById, approvedById, reversesEntryId: entryId,
  }));
}

// Balances are always worked out from posted lines, never from a stored running total.
export async function getBalances(stokvelId) {
  await ensureLedgerTables();
  const rows = await prisma.$queryRaw`
    SELECT "account", SUM("amountCents")::bigint AS total FROM "LedgerLine" WHERE "stokvelId" = ${stokvelId} GROUP BY "account"`;
  return Object.fromEntries(rows.map((r) => [r.account, Number(r.total)]));
}

async function loadEntries(stokvelId, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const lines = await prisma.$queryRaw`
    SELECT "entryId", "account", "amountCents" FROM "LedgerLine" WHERE "entryId" = ANY(${ids})`;
  return rows.map((r) => ({
    id: r.id, stokvelId, seq: r.seq, kind: r.kind, memo: r.memo, reversesEntryId: r.reversesEntryId,
    createdById: r.createdById, approvedById: r.approvedById, createdAt: new Date(r.createdAt).toISOString(),
    prevHash: r.prevHash, hash: r.hash,
    lines: lines.filter((l) => l.entryId === r.id).map((l) => ({ account: l.account, amountCents: Number(l.amountCents) })),
  }));
}

// Newest first, for display.
export async function listEntries(stokvelId, { before = 2147483647, limit = 50 } = {}) {
  await ensureLedgerTables();
  const take = Math.min(Math.max(1, limit), 200);
  const rows = await prisma.$queryRaw`
    SELECT * FROM "LedgerEntry" WHERE "stokvelId" = ${stokvelId} AND "seq" < ${before} ORDER BY "seq" DESC LIMIT ${take}`;
  const entries = await loadEntries(stokvelId, rows);
  return entries.map((e) => ({
    ...e,
    lines: e.lines.map((l) => ({ ...l, amount: fromCents(l.amountCents) })),
  }));
}

const VERIFY_BATCH = 500;
const VERIFY_MAX_BATCHES = 200;

// Walks the whole chain from the start. Any edited, missing or reordered entry is reported.
export async function verifyLedger(stokvelId) {
  await ensureLedgerTables();
  let state = { prevHash: GENESIS_HASH, nextSeq: 1 };
  let afterSeq = 0;
  let checked = 0;
  for (let batchNo = 0; batchNo < VERIFY_MAX_BATCHES; batchNo += 1) {
    const rows = await prisma.$queryRaw`
      SELECT * FROM "LedgerEntry" WHERE "stokvelId" = ${stokvelId} AND "seq" > ${afterSeq} ORDER BY "seq" ASC LIMIT ${VERIFY_BATCH}`;
    if (!rows.length) return { ok: true, complete: true, checked, headHash: state.prevHash };
    const entries = await loadEntries(stokvelId, rows);
    const result = verifyEntries(entries, state);
    if (!result.ok) return { ok: false, complete: true, checked, brokenAtSeq: result.brokenAtSeq };
    state = { prevHash: result.prevHash, nextSeq: result.nextSeq };
    checked += entries.length;
    afterSeq = entries[entries.length - 1].seq;
  }
  return { ok: true, complete: false, checked, headHash: state.prevHash };
}
