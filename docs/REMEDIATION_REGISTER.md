# iCamagu Remediation Register (verified)

Verified against `main` by reading the source. First pass at commit `894ece0`
(22 Oct 2026); second pass (fines, loans, crash handling, start-up) on top of
`838e7ba`; third pass (sign-in) on top of `4784360`; fourth pass (donations
and fund allocations) on top of `f4469f4` (25 Oct 2026); fifth pass (trade
credit and lending rounds) on top of `d0994dd` (26 Oct 2026). No live
database, staging environment or full `node_modules` were available, so
nothing below was verified by running the app against PostgreSQL. Statuses:
Confirmed / Partially confirmed / Not reproduced / Blocked / Not yet reviewed.

Note: commit `77b2e18` briefly replaced `stokvelLendingController.js` with a
placeholder by mistake; `cce0254` restored the intended version. Do not
deploy `77b2e18` on its own.

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
| FIN-04 Money precision | Confirmed, fixed | `parseFloat`/`Number` used for money amounts and `amount * 0.03`; shrine fund reserve worked out by subtracting floats; allocation reserve check ran separately from the insert. Trade credit and lending rounds also used `Number()` (R10.005 silently rounded), summed floats, and trade credit months silently fell back to 12. | Contribution, interest, payout, loan, repayment, fine, shrine donation, fund allocation, **trade credit and lending round/target** amounts are now exact cents (more than 2 decimals refused, never rounded) and read back from the database as exact text. Allocation reserve check + insert ONE transaction under a fund-wide lock. Lending progress worked out in cents and rounded down, so 99.99% never shows "target reached". A group-wide lending target is set in ONE transaction (all members or none). Trade credit status can only go ACTIVE -> USED/CANCELLED, enforced in the update itself, so two officials at once cannot both change it and a used deal cannot be revived. Bad trade credit months are refused. Failed audit lines after a saved deal/round no longer return HTTP 500. Response shapes unchanged. Tests: `payoutController.test.js` (11), `stokvelFinanceController.test.js` (13), `stokvelLendingController.test.js` (9). **Note:** trade credit is a record of a retailer deal and is not posted to the ledger; whether it should be is part of FIN-03. |

## Confirmed, NOT yet fixed

| ID | Evidence | Proposed fix |
|---|---|---|
| DB-01 Migrations | No `prisma/migrations` folder. Schema changed at runtime by `ensure-schema.js` and lazy `CREATE TABLE` in many controllers/services. | Baseline with `prisma migrate diff`, move runtime DDL into versioned migrations, `prisma migrate deploy` before start, restrict app role. Needs staging DB. |
| SEC-01b Distributed throttling | `middleware/rateLimiter.js` is in-memory per process. | Shared store or edge throttling. |

## Not yet reviewed
FIN-03 (balance source of truth, incl. whether trade credit belongs on the ledger), SEC-03 (full authorisation audit), SEC-04, COM-01, COM-02, UX-01..03, Q-01..04.

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
13. Record a lending round of R10.005: refused. Record R100.10 lent and R110.30 back: progress shows exactly R10.20 raised.
14. Set a lending target for every member: all members show the new target (none left on the old one).
15. Add trade credit of R1000.005 or for 0 / 61 months: refused. R1000.50 for 12 months at 12.5%: saved exactly.
16. Mark a trade credit deal USED, then try to set it back to ACTIVE: refused.
17. Two officials mark the same ACTIVE deal at once (one USED, one CANCELLED): only one succeeds; the other is told it was already changed.
