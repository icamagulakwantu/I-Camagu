# iCamagu Security and Delivery Plan

**Working branch:** `security/sec-03-protect-stokvel-financial-history`  
**Purpose:** protect members' money, privacy, cultural trust, and the integrity of ceremony/stokvel workflows before expanding features.

This is a living engineering plan based on source review of the repository. It is not a penetration-test report or production-readiness certification. No production database or deployment environment was accessed.

## Work completed in this branch

- Added a server-side deletion guard that blocks hard deletion when a ledger, members, contributions, payouts, bank imports, or legacy financial records exist. It checks for lazily created legacy tables before querying them.
- Made cleanup for a truly empty stokvel atomic and skip legacy tables that do not exist, preventing partial deletion and failures caused by lazy DDL.
- Made stokvel creation transactional across the group, initial ledger, organiser membership and official record, so a failure cannot leave a partially-created group.
- Changed member departure to fail closed if the outstanding-loan check errors; a database failure can no longer be swallowed and followed by deleting the membership. Added tests for open-loan blocking and query failure.
- Enforced exact-cent validation for stokvel contribution/target amounts and rejected invalid target dates.
- Added focused tests for organiser-only deletion and financial-history protection.
- Changed manual bank-log amount validation to exact cents; values with fractional cents (for example R10.005) are rejected instead of being accepted by `parseFloat`.
- Added tests for invalid fractional-cent bank amounts, non-positive amounts, and valid amounts.
- Made stokvel departure remove membership and official status in one transaction; added a regression test so a failed role cleanup cannot leave a departed member with finance privileges.
- Changed the in-process rate limiter to key by Express route template, HTTP method, base URL and IP rather than the concrete path. This closes the easy bypass where changing an invite or other path ID created a fresh counter; added focused tests. The limiter is still process-local and is not a substitute for shared/edge throttling in multi-instance production.
- Loan voting now requires an actual JSON boolean for `approve`; strings such as `"false"` are rejected rather than coerced to `true`. Added a regression test for the malformed approval input.
- Existing route review confirms reconciliation queue and raw-log creation check official membership in the target stokvel; manual assignment is scoped to the raw log's stokvel, requires an official, requires the target member to belong to that stokvel, and blocks self-assignment. Added unit tests for cross-stokvel member-ID substitution, self-assignment, and DEBIT-vs-CREDIT assignment boundaries. These are unit tests, not PostgreSQL integration tests.

## Security and correctness backlog

### P0 — before real families' money is handled

1. **Financial-history retention / closure**
   - Keep the deletion guard and tests.
   - Replace hard deletion with a designed closure/archive workflow after the legal/accounting retention policy is agreed.
   - Verify that every raw-SQL table and future finance table is included in retention checks.
   - Add PostgreSQL integration tests for zero balance with historical records, positive balance, outstanding loans, pending payouts, unmatched bank logs, and simultaneous delete/finance requests.

2. **Route-by-route authorization regression suite**
   - Add tests for every money-changing route: contributions, interest, payouts, group expenses, fines, loans/repayments, shrine-fund allocations, bank matching, lending rounds and trade-credit changes.
   - For every route accepting IDs, test cross-stokvel ID substitution and member/official/organiser role boundaries.
   - Verify maker/checker separation (requester cannot approve their own expense/payout; no self-assignment of bank deposits).
   - Ensure a revoked official cannot continue a sensitive operation through a stale role or race.

3. **Database consistency and race testing**
   - Run concurrency tests on PostgreSQL for duplicate approvals, two assignments to one bank log, loan vote races, repayment races, payout races, reserve allocation races, and concurrent closure.
   - Confirm unique constraints and row/advisory locks—not only application pre-checks—enforce invariants.
   - Do not run repair scripts against production until a database backup and a reviewed reconciliation report exist.

4. **Secrets and deployment safety**
   - Validate required JWT, database, email, storage, payment and Sentry configuration at startup without logging secret values.
   - Confirm production CORS origins, proxy trust, HTTPS, cookie/token storage, request-size limits, and rate limits at the actual hosting edge.
   - Confirm the app database role cannot perform schema changes once migrations are adopted.

### P1 — high priority

5. **Replace process-local throttling**
   - `server/middleware/rateLimiter.js` stores counters in a per-process Map. That does not coordinate multiple instances and can be bypassed by spreading attempts across instances. Use shared throttling (or edge/WAF controls) for authentication, PIN verification, invites, donation submissions and sensitive actions.

6. **Versioned database migrations**
   - The repository documents no `prisma/migrations` history and uses runtime/lazy DDL in multiple controllers. Baseline the live schema, create reviewed versioned migrations, apply them in staging, and only then change deployment startup. Do not generate and apply a migration blindly against the live database.
   - Move lazy table creation for join requests, expenses, minutes, fines, audit logs, loans, trade credit, lending and ledger tables into migrations.

7. **Privacy and data minimization**
   - Review each API response for unnecessary IDs, member-level financial detail, audit metadata, raw bank narrations/payloads, and borrower agreement details.
   - Confirm consent, retention, export and account-deletion behavior for ID documents, encrypted identity numbers, clan identity matching, and ceremony-related personal data.
   - Ensure logs never include PINs, access tokens, bank payloads, identity documents, or unnecessary personal details.

8. **Security headers, input limits and dependency checks**
   - Verify CSP/security headers, CORS allow-list, JSON body limits, pagination ceilings, date/enum validation, upload content-type/size checks and dependency scanning.
   - Add CI checks for test, build, dependency audit and secret scanning. Triage existing dependency advisories instead of blindly applying breaking upgrades.

### P2 — reliability and maintainability

9. **Auditability and operations**
   - Make audit-log writes durable for security-critical actions. Keep them append-only to application roles and ensure the audit record is written in the same transaction when it is part of the business invariant.
   - Add health/readiness checks, structured redacted logs, error monitoring, backup/restore drills and an incident-response checklist.

10. **Testing and release discipline**
    - CI must pass on the exact PR head; add PostgreSQL service integration tests and test coverage for rollback and concurrency.
    - Require a staging smoke test for signup/login, ceremonies, contributions, payout approvals, loans, bank reconciliation, statements, and account deletion before release.
    - Keep changes in small reviewable PRs. Do not merge a security PR merely because the code compiles.

## Product completion roadmap (after P0 safety gates)

### Ceremony planner
- Persist target budget and actual spend, including non-catalogue costs.
- Assign responsibility and track completion for checklist items.
- Connect checklist items to SmartMatch basket suggestions.
- Keep the Ulwaluko Before / Mountain / After phases and the 14 hierarchy groups clear and culturally respectful.
- Test the planner with real families before treating the 147-item catalogue as complete.

### SmartMatch
- Show pool progress, deadline, group size and expected Rand savings with clear caveats until supplier quotes are confirmed.
- Preserve the documented ladder (Amazibazana Goal → Clan → Eastern Cape → Max) and do not display unverified prices as quotes.
- Make pool state transitions explicit and auditable: OPEN → MATCHED → QUOTED → CONFIRMED → FULFILLED / PARTIAL / FAILED.
- Treat SKU-level supplier minimums, delivery, substitutions, refunds and payment reconciliation as unresolved until real supplier data is available.

### Stokvel and finance
- Finish maker/checker and immutable ledger flows.
- Add monthly close and reconciliation views, with correcting entries rather than silent historical edits.
- Provide clear statements and explainable contribution/payout statuses.
- Never promise identity verification, biometric/liveness checks, bank integrations or supplier fulfilment until implemented and tested.

### Accessibility and cultural fit
- Add an isiXhosa-first language toggle to core flows.
- Use progressive disclosure, legible type, low-friction flows and clear error recovery for family organisers with varied digital confidence.
- Keep “Culture before capital” visible in product decisions: no pressure-based financial upsells, no unverified cultural matching presented as proof, and no clan identity overlap represented as definitive ancestry.

## Release gate

Do not describe iCamagu as production-ready until:
- all P0 items have passing tests on the target commit;
- staging PostgreSQL concurrency and rollback tests pass;
- balance reconciliation has been run on a copy of the real database and reviewed;
- migrations and backups/restore have been tested;
- a privacy/security review and real-family usability pass are complete;
- deployment configuration and monitoring have been verified by the project owner.


## Accessibility follow-up — 27 Oct 2026

- [x] Improve persistent bottom-navigation readability: raise labels from 10px to 12px, increase inactive-label contrast, and use the agreed “More” label for the final tab. This is a targeted UI improvement, not a full WCAG audit.
- [ ] Continue route-by-route contrast, focus-state, text-size and screen-reader checks across core ceremony, SmartMatch and Stokvel flows.
