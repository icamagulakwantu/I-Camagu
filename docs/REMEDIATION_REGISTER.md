# iCamagu Remediation Register (verified)

Verified against `main` by reading the source. First pass at commit `894ece0`
(22 Oct 2026); second pass (fines, loans, crash handling, start-up) on top of
`838e7ba`; third pass (sign-in) on top of `4784360`; fourth pass (donations
and fund allocations) on top of `f4469f4` (25 Oct 2026). No live database,
staging environment or full `node_modules` were available, so nothing below
was verified by running the app against PostgreSQL. Statuses:
Confirmed / Partially confirmed / Not reproduced / Blocked / Not yet reviewed.

## Fixed

| ID | Status | Evidence | Fix |
|---|---|---|---|
| FIN-01 Contribution atomicity | Confirmed, fixed | `contributionController.confirmContribution` committed status + balance in one transaction, then called `postEntry` in a second; failure only produced `ledgerWarning`. Same in `recordInterest`. | Status, balance and ledger entry now one transaction via `postEntryTx`; per-stokvel advisory lock taken first. |
| FIN-02 Payout atomicity | Confirmed, fixed | `approvePayout` claimed CLEARED, then debited/rotated in a 2nd transaction, then posted ledger in a 3rd; a notification failure after clearing returned HTTP 500. | Claim, guarded debit (`totalBalance >= amount`), fund contribution, rotation (re-read under lock) and ledger entry in one transaction. Notifications after commit, failures logged only. |
| FIN-02b Group expense atomicity | Confirmed, fixed | `stokvelApprovalsController.approveExpense` posted ledger after the balance transaction. | Same single-transaction pattern. |
| FIN-01c Fines and loans | Confirmed, fixed | `payFine`, `voteLoan` and `repayLoan` wrote the change and the ledger entry separately; simultaneous final votes or repayments could double-decide or over-repay. | Each is now ONE transaction: ledger lock first, the fine/loan row locked `FOR UPDATE`, checks re-done under the lock, then the change and `postEntryTx`. Audit lines after commit, logged only on failure. `ledgerWarning` still returned (always `null`). Unit tested. |
| SEC-01 PIN brute force | Confirmed, fixed | `pinService.verifyPin` had no counter. | Per-person DB counter `PinFailedAttempt`; 5 wrong in 15 min -> HTTP 429 lock. Unit tested. |
| SEC-02 Account enumeration | Confirmed, mostly fixed | `check-email` returned `exists`/`hasPassword` and leaked `error.message`; OTP `login` returned 404 "No account found" plus the internal `userId`; `verify-otp` took that `userId`. | `check-email` retired (410, reads nothing). `/login` returns the same reply for every email; code created and emailed (without waiting) only for real accounts; no `userId` returned. `/verify-otp` takes `{ email, code }`; wrong guesses for unknown emails counted under a stand-in key so replies and locks match. Password sign-in does a dummy bcrypt check when there is no account. `Login.jsx` shows the same choices to everyone after the email step. 8 unit tests. **Residual:** `register-password` still says "account already exists"; closing that needs an email-confirmation step on sign-up. |
| DB-03 Crash handling | Confirmed, fixed | `uncaughtException` handler logged and kept running. | Log, report to Sentry, flush up to 2 s, `process.exit(1)`. Unhandled rejections logged/reported only (no exit) to avoid restart loops from fire-and-forget sends. Unit tested. |
| DB-02 Startup | Confirmed, fixed | Server served traffic even if the schema check failed, then ran ~25 catalogue backfills every boot. | `/api/health` returns 503 until the schema check passes. Backfills moved to `server/scripts/maintenance.js`; run with `node server/scripts/run-maintenance.js` or `RUN_BOOT_MAINTENANCE=true` for one deploy. |
| FIN-04 Money precision | Confirmed, mostly fixed | `parseFloat`/`Number` used for money amounts and `amount * 0.03`; shrine fund reserve worked out by subtracting floats; allocation reserve check ran separately from the insert, so two admins at once could over-allocate. | Contribution, interest, payout, loan, repayment, fine, shrine donation and fund allocation amounts now exact cents (more than 2 decimals refused, never rounded). Fund totals, reserve and per-sector sums summed in cents. Allocation reserve check + insert now ONE transaction under a fund-wide advisory lock. A failed donation notification no longer turns a saved pledge into HTTP 500. Response shapes unchanged. 11 unit tests in `payoutController.test.js`. **Still open:** trade credit (`createTradeCredit` in `stokvelFinanceController`) and lending rounds (`stokvelLendingController`). |

## Confirmed, NOT yet fixed

| ID | Evidence | Proposed fix |
|---|---|---|
| DB-01 Migrations | No `prisma/migrations` folder. Schema changed at runtime by `ensure-schema.js` and lazy `CREATE TABLE` in many controllers/services. | Baseline with `prisma migrate diff`, move runtime DDL into versioned migrations, `prisma migrate deploy` before start, restrict app role. Needs staging DB. |
| SEC-01b Distributed throttling | `middleware/rateLimiter.js` is in-memory per process. | Shared store or edge throttling. |

## Not yet reviewed
FIN-03 (balance source of truth), SEC-03 (full authorisation audit), SEC-04, COM-01, COM-02, UX-01..03, Q-01..04.

## Not verified here (needs owner/staging)
- Clean `yarn install`, `yarn test`, `yarn build` on this commit (CI runs these on push).
- Concurrency and rollback behaviour against real PostgreSQL (Q-01).
- Dependency audit (Bolt reported 19 advisories; not re-run).
- Render health check path is `/api/health`.

## How to check these changes on staging
1. Confirm a contribution: balance rises once, one CONTRIBUTION ledger entry.
2. Two officials approve the same payout at once: balance drops once, one PAYOUT entry.
3. Wrong PIN 5 times: 6th try (even correct) refused for 15 minutes.
4. Mark a fine paid twice quickly: one FINE_PAID entry, second refused.
5. Two officials cast the final approving loan vote at once: one LOAN_DISBURSEMENT entry.
6. Two officials record the last repayment at once: only one accepted; loan REPAID.
7. Restart the server: "Start-up database check passed", no backfill lines.
8. Sign in: enter a registered email and an unregistered one. Both show the same next screen; "Email me a login code" shows the same message for both; only the registered inbox gets a code.
9. Password-only member, OTP-only member and a new person can each still sign in / sign up.
10. Donate R10.50: stored as exactly 10.50. Donate R10.005 or R0.99: refused.
11. Two admins allocate the last of the fund at the same moment: only one succeeds; the other is told the reserve is too low.
12. Ledger verify for a stokvel: chain still valid.
