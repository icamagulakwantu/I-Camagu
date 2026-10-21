import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import {
  GENESIS_HASH, LedgerError, validateLines, assertDistinctDuties, negateLines, computeEntryHash, verifyEntries,
} from '../utils/ledgerRules.js';
import { fromCents } from '../utils/money.js';

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

// Records one balanced entry. Safe to call twice with the same idempotencyKey:
// the second call returns the first entry instead of counting the money again.
export async function postEntry({
  stokvelId, kind, memo = null, lines, idempotencyKey, createdById, approvedById = null, reversesEntryId = null,
}) {
  if (!stokvelId || !kind || !idempotencyKey || !createdById) throw new LedgerError('Missing entry details');
  validateLines(lines);
  assertDistinctDuties({ createdById, approvedById });
  await ensureLedgerTables();

  return prisma.$transaction(async (tx) => {
    // One writer per stokvel at a time, so sequence numbers and the hash chain never fork.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${stokvelId}))`;

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
  });
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
  return postEntry({
    stokvelId, kind: 'REVERSAL', memo: `Reversal: ${why}`, lines: negateLines(original),
    idempotencyKey: `reversal:${entryId}`, createdById, approvedById, reversesEntryId: entryId,
  });
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
