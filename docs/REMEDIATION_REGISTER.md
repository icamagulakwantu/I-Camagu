# iCamagu Remediation Register (verified)

Verified against `main` by reading the source. First pass at commit `894ece0`
(22 Oct 2026); second pass (fines, loans, crash handling, start-up) on top of
`838e7ba`; third pass (sign-in) on top of `4784360`; fourth pass (donations
and fund allocations) on top of `f4469f4` (25 Oct 2026); fifth pass (trade
credit and lending rounds) on top of `d0994dd` (26 Oct 2026); sixth pass
(balance source of truth, FIN-03) on top of `6c923bc` (26 Oct 2026). No live
database, staging environment or full `node_modules` were available, so
nothing below was verified by running the app against PostgreSQL. Statuses:
Confirmed / Partially confirmed / Not reproduced / Blocked / Not yet reviewed.

Note: commit `77b2e18` briefly replaced `stokvelLendingController.js` with a
placeholder by mistake; `cce0254` restored the intended version. Do not
deploy `77b2e18` on its own.

Note: FIN-03 was pushed in two commits. Deploy only the second one (or
later), never `11e2033` on its own: in that commit fines and loans still
used the older books-only path.

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
| FIN-03 Balance source of truth | Confirmed, fixed in code (history needs review) | Two records of each group's money: the stored running total `StokvelGroupLedger.totalBalance` (shown on screens, used for "enough money?" checks) and the tamper-evident books (`LedgerEntry`/`LedgerLine`). Approved loans and loan repayments, paid fines and ledger reversals changed the books' BANK account but never the stored total, so the two drifted apart: a paid-out loan still showed as money in the pot and could be paid out again as a payout. Bank-matched deposits changed the stored total and then posted the books entry in a SEPARATE transaction (a failure left them apart). | **Decision: the books are the official record.** The stored total is a quick-read copy of the books' BANK account. New `postEntryWithBalanceTx` saves the books entry and moves the stored total by the same amount in ONE transaction; a repeated entry changes nothing. Used by fines, loan payout, loan repayment, reversals and bank-matched deposits (contributions, interest, payouts and expenses already moved both together). A loan can only be paid out if the stored total still covers it (409 otherwise; the vote is not saved). Bank amounts with a fraction of a cent are refused, not rounded. New read-only check `GET /api/stokvels/:id/ledger/balance-check` and script `node server/scripts/check-balances.js` compare the two and report any difference; nothing is ever "fixed" automatically. Screens still show the stored total (as the assessment requires until history is reconciled). 17 new unit tests. **Still open:** (1) stokvels whose loans/fines happened before this fix will show a difference: run the script on a copy of the live database and have an official post a correcting entry for each, never edit rows; (2) trade credit stays off the books: it records a deal with a retailer, not money leaving the group's bank, so it does not belong on BANK; (3) switching screens to read the books directly waits until (1) is done. |

## New policy enforcement (27 Oct 2026)

| ID | Status | Evidence | Fix | Remaining work |
|---|---|---|---|---|
| PAY-01 No-custody checkout gate | Fixed in code; deployment not yet verified | Previously, valid PayFast environment credentials made online checkout available for non-TAVERN categories, sending collections to iCamagu's own merchant account despite the 2026 no-custody policy. | `isOnlinePaymentConfigured()` now returns false as a policy gate, and `initiatePoolPayment()` rejects direct API calls before reading/updating payment rows. Regression test covers configured credentials and direct-call rejection. | Deploy only through reviewed CI; verify Render uses the intended commit; inspect any historical/in-flight PSP payments. This does not process or reverse past payments. Never re-enable without a separate reviewed change after legal, banking, provider, settlement and compliance gates. |

## Authentication resilience update (27 Oct 2026)

| ID | Status | Evidence / change | Remaining work |
|---|---|---|---|
| AUTH-01 Transient refresh failures | Targeted fix in PR #48 and follow-up PR #50 | Refresh endpoint previously cleared the refresh cookie for every error and returned 401, including database outages. The client also cleared an existing session on any failed refresh. A further failure window existed because the token was rotated before the user lookup completed. | PR #48 keeps the existing client session on network/5xx failures and returns 503 without clearing the cookie for unexpected server errors. PR #50 moves the user lookup before token rotation and adds regression tests. Cross-tab / multi-device simultaneous token rotation remains a separate risk to test; this fix does not eliminate the token-reuse policy's multi-tab edge case. |

## Confirmed, NOT yet fixed

| ID | Evidence | Proposed fix |
|---|---|---|
| DB-01 Migrations | No `prisma/migrations` folder. Schema changed at runtime by `ensure-schema.js` and lazy `CREATE TABLE` in many controllers/services. | Baseline with `prisma migrate diff`, move runtime DDL into versioned migrations, `prisma migrate deploy` before start, restrict app role. Needs staging DB. |
| SEC-01b Distributed throttling | `middleware/rateLimiter.js` is in-memory per process. | Shared store or edge throttling. |

## Security review update (26 Oct 2026)

| ID | Status | Evidence / change | Remaining work |
|---|---|---|---|
| SEC-03 Stokvel deletion and authorization | Partially reviewed; targeted mitigation in PR | Hard deletion is now blocked when a ledger, members, contributions, payouts, bank imports or existing legacy finance rows are found. Empty-group cleanup is transactional and skips missing lazy tables. Manual bank-log entry and stokvel contribution/target configuration reject fractional-cent amounts; invalid target dates are refused. Initial stokvel + ledger + organiser membership + official creation is transactional. Member departure now removes membership and official status in one transaction so a failed cleanup cannot leave a departed user with finance privileges. | Full route-by-route IDOR/role audit and PostgreSQL integration/concurrency tests remain open. The departure obligation check can still race with concurrent creation of a loan/payout until the workflow is protected by database-level locking/constraints. Hard deletion still exists for a strictly empty group; verify every legacy table and race before considering this closed. |
| FIN-04b Manual bank-entry precision | Targeted fix in PR | `createRawLog` now uses exact-cent parsing and refuses fractions of a cent rather than accepting them via `parseFloat`; stokvel budget/target configuration uses the same exact-cent rule. | Run unit tests and PostgreSQL integration tests on the PR head. |

The broader prioritised security, reliability, migration and product roadmap is in `docs/SECURITY_AND_DELIVERY_PLAN.md`.

## Not yet reviewed
SEC-03 (remaining authorization routes), SEC-04, COM-01, COM-02, UX-01..03, Q-01..04. The P0/P1 items in `docs/SECURITY_AND_DELIVERY_PLAN.md` are not signed off merely because targeted changes have been made.

## Deployment configuration review (27 Oct 2026)

| ID | Status | Evidence | Required follow-up |
|---|---|---|---|
| DEP-01 Canonical Render service and readiness | Open — owner/staging verification needed | Render workspace currently contains two web services named `I-Camagu` and `I-Camagu-1`. Both point to `https://github.com/icamagulakwantu/I-Camagu`, track `main`, and auto-deploy. Their public URLs and build commands differ; neither has an HTTP health-check path configured. Both were observed live on commit `cae7373` before the authentication refresh follow-up deploy. | Confirm which URL is canonical, compare environment variable *names/presence* and database targets without copying secrets, verify external callback references, align build commands to frozen-lockfile installation, and configure `/api/health` on the canonical service. Do not delete the duplicate until environment parity and traffic use are known. Render log retrieval was unavailable during this check, so application-level HTTP health was not independently verified. |

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
18. Before deploying, run `node server/scripts/check-balances.js` against a copy of the live database and keep the list of mismatches (these are from before the FIN-03 fix).
19. New stokvel: contribute R1000, approve a R400 loan, repay R100, pay a R50 fine. Stored balance shows R750.00 and `/ledger/balance-check` says it matches the books.
20. Stokvel with R300: approve a R500 loan with the final vote. Refused ("balance is too low"); loan still PENDING; balance unchanged.
21. Match a bank deposit by reference code: balance rises once, one CONTRIBUTION entry, balance-check still matches.
22. Reverse a books entry: stored balance moves back by the same amount; balance-check still matches.


## SmartMatch concurrent-join release blocker (review branch)

PR #53 merged the PostgreSQL row lock around pool joins and refreshes the basket snapshot inside the matching transaction. CI passed, and PR #55 added a PostgreSQL integration test proving a concurrent join waits for matching and is rejected after the pool closes. This reduces the risk of late joins attaching to matched pools. A full end-to-end concurrent test proving no basket is omitted from the generated order document remains open; no production database was touched.


## Render runtime findings (27 Oct 2026)

Verified in Render service metadata and recent startup logs: two auto-deploying web services point to the same repository/main branch and same current commit, but differ in build command and observed optional environment warnings. Both report successful startup database checks. Neither has a configured health-check path. The primary domain is reported by Render as `i-camagu.co.za` on `I-Camagu-1`. Environment values were not available from the service metadata response, so parity remains unverified.

**Action:** configure the verified sender, Sentry and identity-encryption settings only if required, add a health check, compare environment/database targets safely, then choose one canonical service after validating DNS, payment/webhook callbacks and real traffic. Online PayFast credentials are intentionally not a launch requirement while the 2026 no-custody policy is in force.


## PAY-02 — Stokvel-funded payments in PSP payout queue (27 Oct 2026)

**Status: fix prepared on PR branch; merge gated on CI.** The payout queue now excludes both `MANUAL_EFT` and `STOKVEL_FUNDS`, and the server-side processor rejects Stokvel-funded rows before writing payout-forwarded metadata. Regression tests verify the queue filter and that no update is written for a blocked payment. Do not process Stokvel-funded rows through the PSP payout workflow. After CI passes, verify the guard is present on the deployed commit; do not inspect or alter production financial rows as part of this change.


## UX-04 — Avoid presenting unquoted SmartMatch savings as a research-backed promise (27 Oct 2026)

**Fix prepared on a review branch.** The combined-order card no longer advertises a generic 8–10% target as “research-backed.” It now says savings remain unconfirmed until a supplier provides a written quote for the specific combined order. This aligns the UI with the rule that price/tier values remain TBC until supported by real supplier quotes.
