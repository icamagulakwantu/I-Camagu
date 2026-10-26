# iCamagu launch-readiness gate

**Status: NOT YET LAUNCH READY.** This is a release gate, not a claim that the application is broken in every area. A passing unit-test/build pipeline is necessary but does not validate real-money flows, deployment secrets, PostgreSQL concurrency, device rendering or cultural review.

## Automated checks

- [ ] Latest full-stack head passes CI after the final commit: frozen install, Prisma generation, `yarn test`, `yarn build`.
- [ ] The reviewable feature stack is reviewed and merged in dependency order by the repository owner. Temporary validation PRs #36 and #38 must never be merged.
- [ ] A clean checkout can install from the committed lockfile; no lockfile regeneration is performed as part of a release without review.

## Database and financial integrity — release blockers

- [ ] Establish versioned Prisma migrations from the current production schema. The repository currently has no `prisma/migrations` history and uses runtime/lazy schema DDL in several paths. Baseline and test against a staging database before changing startup to migration-only.
- [ ] Run the balance-check script on a copy of live data; reconcile any historic divergence through auditable correcting entries approved by the relevant stokvel officials. Never rewrite historical ledger rows to force a match.
- [ ] Run PostgreSQL integration tests for transaction rollback and concurrent requests, including payout, contribution, fund allocation, final loan votes/repayments, and stokvel-funded pool approvals. Unit tests alone are not enough for row-lock/transaction guarantees.
- [ ] Resolve the remaining race risk in stokvel pool funding availability checks with a database lock/serializable transaction and concurrency test; do not rely only on a preflight balance read.
- [ ] Verify provider webhooks, payment idempotency, refunds, reconciliation and partner settlement in a PSP sandbox. An approval or pending settlement must never be displayed as money already paid.
- [ ] Reconcile supplier/order statuses and per-member allocations end to end in staging. Keep separate pools and stokvel balances separate unless each organiser explicitly approves a combined order.

## Security and privacy — release blockers

- [ ] Complete route-by-route authorization audit for every read/write route, including cross-user IDs, clan-only content, ceremony ownership, supplier/admin actions, account export/deletion and uploaded media.
- [ ] Replace the in-memory per-process rate limiter with a shared/distributed store or enforce equivalent rate limiting at the trusted edge for multi-instance deployments.
- [ ] Close the account-registration enumeration residual by implementing an email-confirmation flow before revealing whether an address is already registered.
- [ ] Run dependency audit and triage the previously reported advisories; document accepted residual risks rather than assuming old scan results are current.
- [ ] Verify production secrets and permissions: JWT/session secrets, Google auth, Resend, Sentry, Supabase service role, PayFast/PSP credentials and webhook secrets must be configured in the deployment secret store, never committed.
- [ ] Verify private Supabase media bucket policies and signed URL expiry. Test that one user cannot fetch another user's private ceremony media.
- [ ] Confirm account deletion/export, retention, consent, POPIA-facing privacy notice and incident/contact process with the owner.

## SmartMatch, pricing and catalogue

- [ ] Capture exact, current outlet evidence for every stale price observation in [the 26 October recheck log](./pricing/recheck-2026-10-26.md). Preserve the old rate until product, pack, outlet, price date, stock and source are confirmed.
- [ ] Implement an auditable price-check workflow for product/pack, retail baseline, supplier cost, outlet, quote date/expiry, minimum quantity, delivery fees, approved tier and approver.
- [ ] Preserve the founder's researched pricing policy: target at least 5% below comparable retail; target 8–10% at the qualifying larger combined-volume tier, with potentially better negotiated terms. For each actual order, record eligible SKUs and the selected outlet's final quote.
- [ ] Require supplier confirmation for mixed-SKU eligibility and pallet-equivalent conversions. Until confirmed, show the combined Rand value and clearly label the pallet-equivalent figure as indicative.
- [ ] Test the entire SmartMatch flow with real test users: create pools, join different categories, opt in to coordinate, quote, confirm, pay, partially fulfil, fail/refund and reconcile member allocations.
- [ ] Confirm stokvel-funded orders require the configured distinct-official approval policy and cannot overdraw under concurrent requests.

## Cultural identity and ceremony content

- [ ] Import and validate the intended full Iziduko seed dataset and its matching tests. The current stack documents that the prior 167-clan seed is not in the repository; do not fabricate entries or claim full coverage until it is recovered and reviewed.
- [ ] Test exact, alias, shared-praise and ambiguous-clan matches; unknown names must enter the review queue and must never auto-create canonical clan groups.
- [ ] Keep draft ceremony types hidden until founder/community review is recorded. Validate sacred/ritual checklist wording, livestock guidance and price profiles with appropriate local reviewers; do not turn uncertain practice into a universal rule.
- [ ] Verify public, clan-only and private visibility with different test accounts. Private ceremonies and personal details must never leak through feeds or demand signals.

## Device, accessibility and operations

- [ ] Test Android Chrome and installed PWA on a physical Android device: login/password/OTP, keyboard resize, focus, autofill, form contrast, bottom navigation, long forms, offline/reconnect and small-screen layouts.
- [ ] Test current Safari/Chrome desktop and one lower-powered Android device for rendering and performance.
- [ ] Confirm error monitoring, health checks, logs without sensitive data, backups, restore procedure, database connection limits, rollback plan and a named incident owner.
- [ ] Perform a staging smoke test with test accounts and non-production payment credentials. Do not use real family/stokvel funds during launch rehearsal.
- [ ] Complete a founder sign-off on pricing, ceremony types, cultural language, privacy text, terms, customer support route and launch scope.

## Current evidence snapshot — 26 October 2026

- Full-stack GitHub Actions run [#40318741650](https://github.com/icamagulakwantu/I-Camagu/actions/runs/40318741650) passed on head `25d59925e349ac360dbf26f372c09a7354c2765a`: frozen dependency install, Prisma generation, `yarn test`, and `yarn build`.
- That run validates the code at that exact SHA only. Any subsequent commit, including a documentation-only commit, needs its own CI result before the new head is called validated.
- The focused funding-controller tests mock Prisma. They do not establish PostgreSQL concurrency/rollback behaviour; staging integration tests remain required.
- No live PostgreSQL integration, production/staging deployment, PSP sandbox, physical Android review or cultural community sign-off has been performed in this work session.
- The listed release blockers must be checked off with evidence before the app is represented as launch-ready.
