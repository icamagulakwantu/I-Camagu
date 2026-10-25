# iCamagu Remediation Register (verified)

Verified against `main` by reading the source. First pass at commit `894ece0`
(22 Oct 2026); second pass (fines, loans, crash handling, start-up) on top of
`838e7ba` (25 Oct 2026). No live database, staging environment or full
`node_modules` were available, so nothing below was verified by running the
app against PostgreSQL. Statuses: Confirmed / Partially confirmed /
Not reproduced / Blocked / Not yet reviewed.

## Fixed

| ID | Status | Evidence | Fix |
|---|---|---|---|
| FIN-01 Contribution atomicity | Confirmed, fixed | `contributionController.confirmContribution` committed status + balance in one transaction, then called `postEntry` in a second; failure only produced `ledgerWarning`. Same in `recordInterest`. | Status, balance and ledger entry now one transaction via `postEntryTx`; per-stokvel advisory lock taken first. |
| FIN-02 Payout atomicity | Confirmed, fixed | `approvePayout` claimed CLEARED, then debited/rotated in a 2nd transaction, then posted ledger in a 3rd; a notification failure after clearing returned HTTP 500. | Claim, guarded debit (`totalBalance >= amount`), fund contribution, rotation (re-read under lock) and ledger entry in one transaction. Notifications after commit, failures logged only. |
| FIN-02b Group expense atomicity | Confirmed, fixed | `stokvelApprovalsController.approveExpense` posted ledger after the balance transaction. | Same single-transaction pattern. |
| FIN-01c Fines and loans | Confirmed, fixed | `payFine` marked the fine paid, then posted the ledger separately with a warning on failure. `voteLoan` set APPROVED then posted the disbursement separately; two simultaneous final votes could both decide. `repayLoan` inserted the repayment, set REPAID and posted the ledger as three separate writes; two simultaneous repayments could together exceed what was owed. | Each is now ONE transaction: ledger lock first, the fine/loan row locked `FOR UPDATE`, checks re-done under the lock, then the change and `postEntryTx`. Audit-trail lines are written after commit and a failure there is logged, never returned as an error. `ledgerWarning` is still returned (always `null`) so `LoanBoard.jsx` and `StokvelApprovalsPanel.jsx` keep working. Fine amounts now exact cents. Vote decision and principal/interest split unit tested. |
| SEC-01 PIN brute force | Confirmed, fixed | `pinService.verifyPin` had no counter; only in-memory per-IP/path limiter on auth routes (none on money routes). | Per-person DB counter `PinFailedAttempt`; 5 wrong in 15 min -> HTTP 429 lock. Counted before compare so parallel guesses are bounded. Unit tested. |
| DB-03 Crash handling | Confirmed, fixed | `uncaughtException` handler logged and kept the process running in an unknown state. | `server/config/processHandlers.js`: log, report to Sentry, wait up to 2 s for the report (`sentry.flush`), then `process.exit(1)` so Render restarts a clean process. Unit tested. Unhandled promise rejections are still logged and reported but do NOT exit yet, because some notification sends are fire-and-forget and exiting could cause a restart loop; revisit after an audit of background promises. |
| DB-02 Startup | Confirmed, fixed | `server/index.js` started serving even when the schema check failed, then ran ~25 catalogue backfills/price rewrites on every boot (one overwrote another each boot). | `/api/health` now returns 503 until the schema check has passed (and stays 503 if it failed). The backfills moved to `server/scripts/maintenance.js` and no longer run on start. Run them by hand with `node server/scripts/run-maintenance.js`, or set `RUN_BOOT_MAINTENANCE=true` for one deploy. Order is unchanged; October 2026 prices still run last. |
| FIN-04 Money precision | Partially confirmed, partly fixed | `parseFloat`/`Number` used for money amounts and `amount * 0.03`. | Contribution, interest, payout, loan, repayment and fine amounts now exact cents. Still open: shrine donations and fund allocations (`payoutController`), trade credit and lending rounds. |

## Confirmed, NOT yet fixed

| ID | Evidence | Proposed fix |
|---|---|---|
| DB-01 Migrations | No `prisma/migrations` folder. Schema is changed at runtime by `server/scripts/ensure-schema.js` and lazy `CREATE TABLE` in ledger, OTP, PIN, approvals, finance and records code. App DB role can therefore alter schema. | Baseline with `prisma migrate diff`, move runtime DDL into versioned migrations, run `prisma migrate deploy` before start, restrict app role. Needs staging DB. |
| SEC-02 Account enumeration | `POST /api/auth/check-email` returns `exists` and `hasPassword`; OTP `login` returns 404 "No account found"; `check-email` 500 leaks `error.message`. `src/pages/Login.jsx` depends on `check-email`. | Redesign sign-in to a uniform response (needs a small login screen change). |
| SEC-01b Distributed throttling | `middleware/rateLimiter.js` is in-memory per process; ineffective across instances. | Shared store or edge throttling. |

## Not yet reviewed
FIN-03 (balance source of truth; `getBalances` is ledger-derived but screens use `StokvelGroupLedger.totalBalance`), SEC-03 (full authorisation audit beyond the files above), SEC-04, COM-01, COM-02, UX-01..03, Q-01..04.

## Not verified here (needs owner/staging)
- Clean `yarn install`, `yarn test`, `yarn build` on this commit (CI on push will run these).
- Concurrency and rollback behaviour against real PostgreSQL (Q-01).
- Dependency audit (Bolt reported 19 advisories; not re-run).
- Whether Render's health check path is `/api/health`. If it is, a deploy whose schema check fails will now be held back instead of going live.

## How to check these changes on staging
1. Confirm a contribution: balance rises once and one CONTRIBUTION ledger entry appears.
2. Two officials approve the same payout at the same time: balance drops once, one PAYOUT entry.
3. Enter a wrong PIN 5 times: the 6th try (even correct) is refused for 15 minutes.
4. Mark a fine paid: one FINE_PAID ledger entry. Tap it twice quickly: the second is refused.
5. Two officials cast the final approving vote on a loan at the same moment: one LOAN_DISBURSEMENT entry.
6. Two officials record the last repayment of a loan at the same moment: only one is accepted; the loan shows REPAID.
7. Restart the server: logs show "Start-up database check passed" and no catalogue backfill lines.
8. Run ledger verify for a stokvel: chain still valid.
