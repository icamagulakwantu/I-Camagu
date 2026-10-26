# Prisma migration baseline procedure

The repository schema is currently the only complete schema declaration. Do not mark a generated baseline as the production baseline until it has been compared with a current, access-controlled snapshot of the deployed database.

## Disposable validation

The CI job `migration-baseline-validation` generates a candidate SQL baseline from `prisma/schema.prisma`, applies it to a fresh PostgreSQL 16 database, checks for Prisma schema drift, and uploads the SQL as a short-lived review artifact. This proves the candidate can build the declared schema from empty; it does **not** prove it matches production.

## Before adopting the baseline

1. Obtain a schema-only dump from the actual target environment through the authorized database owner. Do not include production data, credentials, or secrets in the repository.
2. Compare the deployed schema, `prisma/schema.prisma`, and the CI candidate. Resolve missing tables, columns, indexes, constraints, triggers, enums, extensions, and raw-SQL-managed objects explicitly.
3. Review the generated SQL and any data-preserving transformations with a second reviewer.
4. Create the first versioned migration under `prisma/migrations/<timestamp>_baseline/migration.sql` and commit `migration_lock.toml` with provider `postgresql`.
5. For an existing database, follow Prisma's baseline/adoption procedure only after a verified backup and restore test. Mark the baseline applied with `prisma migrate resolve --applied <migration-name>` only after confirming the live schema matches the baseline. Never run a generated create-all baseline against an existing populated database.
6. On a staging clone, verify migration status, run the migration workflow, exercise the finance and SmartMatch integration tests, and rehearse rollback/restore before scheduling any production change.

## Important limitation

CI uses `prisma db push` only to create disposable test schemas. It must not be treated as a replacement for reviewed, versioned migrations or as evidence that staging/production has been migrated.
