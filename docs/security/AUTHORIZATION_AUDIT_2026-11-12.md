# Route-by-route authorization audit — 12 November 2026

Scope: every route registered in `server/routes/*.js` (239 routes across 24 files) and the routes defined directly in `server/index.js`. Method: a static scan listing each route, whether it requires sign-in, and whether its handler contains an access check; then a manual read of every handler that acts on a record identified by the caller (a URL parameter or an ID in the request body), including the services those handlers call.

This is a source review. It does not replace testing with two real accounts on staging, which remains a launch step.

## Result

| Area | Routes reviewed | Result |
|---|---|---|
| Sign-in and registration (`/api/auth`) | 11 | Public by design; rate limited. |
| Public pages (`/api/public`, ceremony timelines, legends, catalogue, Ubuhlanti total) | 9 | Public by design. Plan pages need the plan's unguessable share token. |
| Health (`/api/health`, `/api/health/env`, `/api/health/storage`) | 3 | Public by design: yes/no flags only, no secret values. CI's production smoke test relies on them. Accepted. |
| Stokvels, ledger, loans, lending, fines, minutes, constitution, approvals, pool funding, contributions, payouts, reconciliation | 69 | Member check on every stokvel route; official-only actions use the shared `getStokvelRole`/`guard` check; organiser-only for update and delete; payout recipients must be members, and rotating stokvels force the recipient whose turn it is; reconciliation is official-only and nobody can assign a deposit to themselves. |
| Ceremonies, plans, checklists, costs, pledges, budget, templates, hierarchy, Ekoyini bookings, tourism | 45 | Every handler checks `hostId` against the signed-in person. |
| Bulk Buy: basket, pools, payments, order documents | 31 | Baskets and payments are looked up by owner; private orders are visible only to their owner; shared pool summaries expose totals only. Online payment stays disabled (record-only mode). |
| Suppliers and merchant offers | 11 | Payment confirmation and fulfilment check that the pool belongs to the supplier; offer acceptance is admin-only; merchants see order totals only, never members' names or contact details. See finding 2. |
| Clan groups, iziduko connections, messages, ancestral rites | 26 | Group actions require membership or the creator role; connection requests check requester/recipient; profiles need an accepted connection; messages need an accepted connection; rites are limited to the person's family list. |
| Family archive (portal media) | 7 | Owner-only; upload paths are confined to the owner's own folder and checked on confirmation. |
| Account, user, notifications, activity, expenditure, reciprocity, ukusoka, directory, identity, legends | 30 | Scoped to the signed-in person; admin actions check the admin list; directory votes block voting on your own listing. See finding 1. |

## Findings

1. **Fixed — ukusoka entries could be attached to another person's ceremony.** `POST /api/ukusoka` accepted any `ceremonyId` without checking ownership, and linked entries are returned inside that ceremony to its host. The handler now refuses a ceremony the person does not host (403), with tests in `server/controllers/ukusokaController.test.js`.
2. **Fixed — merchants are now verified before they can quote.** Any signed-in person could register as a supplier and immediately send offers. Now a merchant's offers are refused until an admin verifies them (`Partner.verifiedAt`, `verifiedById`, `verificationNote`), and an admin cannot accept an offer from an unverified merchant. Verifying requires a note of what was checked; it can be revoked, which stops new offers without undoing accepted ones. Merchants can still register and see group-order totals while they wait. Admins verify on the Merchants tab of Group orders & offers; offers show a verified or not-verified label. Tests: `server/services/offerService.verification.test.js`. Existing merchants start unverified and must be checked once.
3. **Note — reconciliation treats the organiser differently from other routes.** Reconciliation checks the `StokvelOfficial` table only, so an organiser who is not also listed as an official cannot log or assign bank entries, while other official-only stokvel actions treat the organiser as an official. This is stricter, not weaker; align it when the reconciliation screen is next changed.

## Still to do before launch

- Repeat the critical paths with two real test accounts on staging (cross-user reads of ceremonies, stokvel ledgers, private media and messages).
- Distributed rate limiting (the limiter is per process).
- Registration timing review (finding from PR #80 remains open).
