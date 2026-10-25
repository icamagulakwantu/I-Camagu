# iCamagu Remediation Register (verified)

Verified against `main` at commit `894ece0` (22 Oct 2026) by reading the source.
No live database, staging environment or `node_modules` were available, so
nothing below was verified by running the app against PostgreSQL. Statuses:
Confirmed / Partially confirmed / Not reproduced / Blocked / Not yet reviewed.

## Fixed in this change

| ID | Status | Evidence | Fix |
|---|---|---|---|
| FIN-01 Contribution atomicity | Confirmed, fixed | `contributionController.confirmContribution` committed status + balance in one transaction, then called `postEntry` in a second; failure only produced `ledgerWarning`. Same in `recordInterest`. | Status, balance and ledger entry now one transaction via `postEntryTx`; per-stokvel advisory lock taken first. |
| FIN-02 Payout atomicity | Confirmed, fixed | `approvePayout` claimed CLEARED, then debited/rotated in a 2nd transaction, then posted ledger in a 3rd; a notification failure after clearing returned HTTP 500. | Claim, guarded debit (`totalBalance >= amount`), fund contribution, rotation (re-read under lock) and ledger entry in one transaction. Notifications after commit, failures logged only. |
| FIN-02b Group expense atomicity | Confirmed, fixed | `stokvelApprovalsController.approveExpense` posted ledger after the balance transaction. | Same single-transaction pattern. |
| SEC-01 PIN brute force | Confirmed, fixed | `pinService.verifyPin` had no counter; only in-memory per-IP/path limiter on auth routes (none on money routes). | Per-person DB counter `PinFailedAttempt`; 5 wrong in 15 min -> HTTP 429 lock. Counted before compare so parallel guesses are bounded. Unit tested. |
| FIN-04 Money precision | Partially confirmed, partly fixed | `parseFloat` used for contribution/interest/payout amounts and `amount * 0.03`. | Those paths now use exact cents; 3% computed in integer cents (half-up). Unit tested. |

## Confirmed, NOT yet fixed (next slices)

| ID | Evidence | Proposed fix |
|---|---|---|
| FIN-01c Fines and loans | `stokvelRecordsController.payFine` and `stokvelFinanceController` (loan issue/repayment) still post ledger after the main write with a warning; repayment insert + REPAID update not in one transaction. | Apply `postEntryTx` pattern. |
| DB-01 Migrations | No `prisma/migrations` folder. Schema is changed at runtime by `server/scripts/ensure-schema.js` and lazy `CREATE TABLE` in ledger, OTP, PIN, approvals, finance and records code. App DB role can therefore alter schema. | Baseline with `prisma migrate diff`, move runtime DDL into versioned migrations, run `prisma migrate deploy` before start, restrict app role. Needs staging DB. |
| DB-02 Startup | `server/index.js` starts listening even when the schema check fails, then runs ~25 data backfills/price rewrites on every boot (comment notes one overwrites another each boot). | Fail readiness if schema check fails; move backfills to explicit, one-off maintenance commands with dry-run. |
| DB-03 Crash handling | `uncaughtException` handler logs and keeps the process running in an unknown state. | Log, flush Sentry, `process.exit(1)`; let Render restart. |
| SEC-02 Account enumeration | `POST /api/auth/check-email` returns `exists` and `hasPassword`; OTP `login` returns 404 "No account found"; `check-email` 500 leaks `error.message`. `src/pages/Login.jsx` depends on `check-email`. | Redesign sign-in to a uniform response (needs a small login screen change). |
| SEC-01b Distributed throttling | `middleware/rateLimiter.js` is in-memory per process; ineffective across instances. | Shared store or edge throttling. |

## Not yet reviewed
FIN-03 (balance source of truth; `getBalances` is ledger-derived but screens use `StokvelGroupLedger.totalBalance`), SEC-03 (full authorisation audit beyond the files above), SEC-04, COM-01, COM-02, UX-01..03, Q-01..04.

## Not verified here (needs owner/staging)
- Clean `yarn install`, `yarn test`, `yarn build` on this commit (CI on push will run these).
- Concurrency and rollback behaviour against real PostgreSQL (Q-01).
- Dependency audit (Bolt reported 19 advisories; not re-run).

## How to check this change on staging
1. Confirm a contribution: balance rises once and one CONTRIBUTION ledger entry appears.
2. Two officials approve the same payout at the same time: balance drops once, one PAYOUT entry.
3. Enter a wrong PIN 5 times: the 6th try (even correct) is refused for 15 minutes.
4. Run ledger verify for a stokvel: chain still valid.
