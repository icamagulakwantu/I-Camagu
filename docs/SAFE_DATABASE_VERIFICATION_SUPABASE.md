# Safe database verification — Render + Supabase PostgreSQL

**Purpose:** prepare a safe, evidence-based Prisma migration baseline without writing to production.

**Known deployment facts (owner-confirmed, 26 October 2026):**
- Render hosts the iCamagu backend.
- Supabase hosts PostgreSQL.
- Whether Supabase Storage is actively used in production is not yet confirmed. The repository has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` settings in `env.example`; configuration alone does not prove which features or buckets are live.

## Non-negotiable safety rules

- Do not run `prisma migrate deploy`, `prisma migrate resolve`, `prisma db push`, `prisma migrate reset`, or any SQL DDL against the production Supabase database during discovery.
- Do not generate a create-all baseline and apply it to the populated database. The generated candidate is for comparison only.
- Do not run the balance checker against production as the first step. Run it against a verified, access-controlled staging restore/copy first.
- Do not put database URLs, passwords, service-role keys, customer rows, ledger rows, or full database dumps in GitHub, issues, logs, or chat.
- Do not modify or delete historical financial ledger entries to make balances agree. Any correction must be a separately auditable entry, authorised by the appropriate stokvel officials.
- If a backup/restore route or the target database identity is unclear, stop and ask the owner before proceeding.

## Phase 1 — identify the target without changing it

1. In Render, identify the exact backend service and confirm that its `DATABASE_URL` points to the intended Supabase project. Do not copy the secret value into notes or chat. Record only the Supabase project reference/name and whether the URL is a direct database connection or a pooler connection.
2. In Supabase, verify the project name/reference and database environment (production vs staging). Do not assume the project is production based only on its name.
3. Confirm the deployed backend is using the expected schema (normally `public`) and the expected database. Treat this as read-only verification.
4. Confirm the current Supabase backup/PITR availability and retention in the dashboard. Before any future schema change, ensure a recoverable backup exists and rehearse restoring it to a separate staging project. A backup indicator without a successful restore rehearsal is not sufficient evidence.
5. Confirm whether Supabase Storage is actually used by production features. Inspect bucket names and access policies in the dashboard without exposing service-role credentials. Verify private buckets and signed-URL rules separately from PostgreSQL migrations.

## Phase 2 — obtain a schema-only snapshot

Use a trusted local machine or approved secure runner, not a public CI job with production credentials. Prefer a direct Supabase PostgreSQL connection for `pg_dump`; some pooler connection modes do not support every administrative operation. Keep the connection string in a local secret/environment manager, never in the command text or a committed file.

Example, after the authorized operator has set `DATABASE_URL` securely in the local environment:

```sh
umask 077
pg_dump "$DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=supabase-production-schema-only.sql
```

This output is still sensitive infrastructure information. Store it in restricted local storage, do not commit it, and remove it securely according to your retention policy after review. Verify that the dump contains no table data; never use a full data dump for this comparison task.

Also capture read-only migration metadata (if the table exists), for example whether `_prisma_migrations` exists and its migration names/status. Do not modify that table during discovery. If no migration history exists, record that fact; do not create or mark a baseline applied yet.

## Phase 3 — compare, do not apply

Compare these three items:
1. The schema-only snapshot from the actual Supabase target.
2. `prisma/schema.prisma` from this repository's `main`.
3. The candidate SQL artifact produced by CI job `migration-baseline-validation`.

Review differences beyond Prisma's model representation, including raw-SQL-managed tables/columns, enum values, indexes, foreign keys, check constraints, triggers, extensions, views, functions, grants and row-level security policies. Prisma's schema diff alone does not cover every PostgreSQL object or Supabase policy.

The following Prisma command can help report a difference between the current database and the repository schema. Run it only from a trusted local environment with the authorized target URL set securely; this is a read-only comparison:

```sh
./node_modules/.bin/prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma
```

Do not treat an empty Prisma diff as proof that triggers, policies, grants, extensions, or all raw-SQL objects match. Have a second reviewer inspect the schema-only comparison and record unresolved differences without copying production data or secrets into the report.

## Phase 4 — verify balances on a restored staging copy

1. Restore a verified backup to a separate Supabase staging project/database with access limited to the approved operators. Never point staging at production.
2. Confirm the Render staging service uses only the staging database and non-production payment credentials.
3. From a trusted environment configured with the staging database URL, run the repository's read-only balance checker:

   ```sh
   node server/scripts/check-balances.js
   ```

4. Preserve the command's summary and a redacted mismatch count. Do not publish stokvel IDs or individual balances to public logs or issues.
5. Investigate every mismatch against the ledger and stored balance on the staging copy. Do not silently update stored balances and do not edit historical ledger entries. Any correction must follow the app's approved, auditable financial correction process.
6. Exercise existing PostgreSQL integration tests and verify the staging copy can be restored again before proposing a production migration.

## Phase 5 — baseline decision gate

Only after the schema comparison, restore rehearsal, balance review, and second-person review:
- Prepare a reviewed, versioned migration file under `prisma/migrations/<timestamp>_baseline/migration.sql`.
- Validate it on a disposable PostgreSQL instance and a staging clone.
- Confirm the baseline matches the existing database before considering `prisma migrate resolve --applied <migration-name>`. That command changes migration metadata and must not be used until the owner approves the exact target and the evidence proves the schema already matches.
- Keep runtime/lazy schema DDL in place until a separately reviewed rollout plan proves it is safe to remove. Do not combine baseline adoption, unrelated schema changes, and removal of runtime DDL in one untested production deployment.
- Schedule production work only after a named owner approves the backup, restore evidence, diff review, maintenance/rollback plan, and exact commands.

## Current state

- CI validates a generated candidate baseline against a fresh disposable PostgreSQL database. That is useful, but it is not a production-schema comparison.
- The repository still has no reviewed, committed baseline migration.
- No production Supabase schema has been inspected or changed by this runbook's creation.
- Live-data balance verification, backup/restore rehearsal, schema comparison, and baseline adoption remain **not done** until evidence is recorded.

