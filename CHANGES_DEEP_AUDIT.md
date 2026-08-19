# iCamagu — Deep Audit & Integration Report

Date: 19 August 2026

## Source used

This pass used `iCamagu-main-updated-2026-08-18.zip` as the full repository baseline, then compared it against the two supplied drop-in correction ZIPs and the implementation handover.

The existing architecture was preserved: React + Vite frontend, Express backend, Prisma + PostgreSQL, Supabase Storage and the existing service/controller structure.

## Important discovery: the main ZIP contained a ceremony-controller regression

The full repository's `server/routes/ceremony.js` imported many functions that were no longer exported by the corresponding `server/controllers/ceremonyController.js`.

The missing functions included:

- `getCeremonyTypes`
- `getMyCeremonies`
- `createCeremony`
- `deleteCeremony`
- `createPreparationPlan`
- `getMyPlans`
- `deletePreparationPlan`
- `toggleChecklistItem`
- `updateChecklistItemCost`
- `addPledge`
- `generateShareLink`
- `getPublicPlan`

That is a real runtime failure, even though `node --check` can pass because the problem is an ES-module named-export mismatch rather than JavaScript syntax.

The more complete ceremony controller from the supplied v2 correction set was integrated, while the newer schema and storage changes from the full repository were preserved.

## Ceremony engine

### Preserved

- Ulwaluko remains standalone.
- Umgidi remains standalone.
- Other supported ceremony types remain independently selectable.
- The existing 14-group hierarchy remains intact.
- Auto-generated ceremonies receive the 14 groups.
- Custom ceremony checklist items are supported.
- Ulwaluko timeline is separated into:
  - Before the mountain
  - Mountain phase
  - After the mountain
- uMojiso remains part of Ulwaluko.
- Livestock remains a resource/choice, not an Inkomo module.

### Fixed

The Ceremony Hub previously grouped several ceremonies under `Imisebenzi yeNkomo`. That was removed. The UI now requests ceremony types from the backend and presents them independently, while excluding the legacy `UMSEBENZI_WENKOMO` grouping and duplicate `IMIGIDI` alias from the user-facing list.

The timeline frontend was also speaking a different data shape from the backend. It expected a flat array while the ceremony engine returns phase objects. The timeline screen now renders the returned phases directly.

The timeline endpoint remains public because the ceremony knowledge layer is intended to be free cultural infrastructure.

## Checklist inventory

The actual default checklist registry in `server/controllers/ceremonyCostProfiles.js` contains:

| Ceremony | Default checklist items |
|---|---:|
| Ulwaluko | 24 |
| Umgidi | 16 |
| Intambo Enkulu | 25 |
| Ukukhapha | 19 |
| Inkobe zikaMama | 18 |
| Ukubuyisa | 20 |
| Umsebenzi weGqirha | 21 |
| Generic | 4 |
| **Total** | **147** |

The specialised ceremony total is 143 and the generic starter contributes 4 more.

There are also 143 corresponding default cost-profile entries across the seven specialised ceremony types. Those are cost-estimation entries, not additional checklist tasks.

Therefore the current code does **not** actually contain a 180+ checklist. The earlier larger figure should not be treated as authoritative.

## Stokvel contribution bug fixed

The Prisma schema defines `Contribution.memberId` as the `StokvelMember` ID.

The old controller attempted to create a contribution using the authenticated user's ID and also attempted to write a `note` field that was not in the schema.

Fixed:

- contribution creation now uses `membership.id`
- `Contribution.note` is now stored because the existing UI already collects an EFT/reference note
- account export resolves the user's StokvelMember IDs before exporting contributions
- activity feed resolves the user's StokvelMember IDs before loading contributions

This reconnects the Stokvel UI to the actual database model.

## Ceremony pledges fixed

`CeremonyPlanner.jsx` contained an older API contract:

`/api/ceremonies/pledges`

That endpoint did not exist.

The schema actually models pledges as `ContributionPledge` attached to `PreparationPlan`.

The implementation now exposes:

- `GET /api/ceremonies/plans/:planId/pledges`
- `POST /api/ceremonies/plans/pledges`
- `DELETE /api/ceremonies/plans/pledges/:pledgeId`

The planner now uses those endpoints.

## Ceremony checklist communication fixed

The planner already had UI for adding household-specific checklist items, but the backend endpoint was missing from the selected controller version.

Added:

- `POST /api/ceremonies/:id/checklist`
- `PATCH /api/ceremonies/ceremony-checklist/:id/toggle`

Both verify ceremony ownership.

## Ceremony plan refresh fixed

A newly created plan could display the auto-generated ceremony checklist immediately, but after a refresh the plan endpoint did not include its parent ceremony's checklist.

`getMyPlans` now includes the related ceremony and its checklist/cost items so the ceremony engine survives a reload.

## Ceremony security checks

Host ownership checks are enforced for:

- ceremony checklist updates
- ceremony cost updates
- cost estimates
- custom checklist creation
- ceremony checklist toggles
- plan pledges
- plan deletion
- ceremony deletion/update

## Basket bug fixed

The Basket frontend supported changing a basket item's quantity with:

`PATCH /api/basket/items/:itemId`

but the backend only implemented POST and DELETE.

Added the missing update controller and route.

The update is restricted to the authenticated user's draft basket.

## App navigation bug fixed

The SideDrawer contained a `My Activity` entry, but `App.jsx` did not render an `activity` screen.

The Activity page is now connected to App navigation.

The Activity page itself contained trailing duplicated JSX that caused a syntax error; that malformed trailing block was removed.

## Existing Activity data bug fixed

Activity contributions were being queried with `memberId = userId` even though the schema stores `StokvelMember.id` there.

The activity controller now resolves membership IDs first.

## Existing advanced files selected

The repository contained two generations of some features.

The full repository's newer portal/storage implementation was preserved because it is more complete than the older drop-in version.

The fuller ceremony controller from the v2 correction set was integrated because the full repository's controller had regressed and no longer matched its route imports.

The advanced `EkoyiniQuoteForm.jsx` was connected to the Ekoyini flow because it matches the extensive `EkoyiniQuoteRequest` schema much more closely than the smaller legacy form.

## Ekoyini quote flow

The old compact Ekoyini page submitted fields such as `package`, `contactName` and `contactPhone`, while the backend requires fields such as:

- `fullName`
- `surname`
- `clientEmail`
- `cellPhone`
- `eventType`
- `venueArea`
- `guestCount`
- `packageSelected`

The advanced quote form now handles that backend contract.

The quote form also recognises the documented ceremony types instead of treating `UMSEBENZI_WENKOMO` as a user-facing ceremony category.

## Cultural tourism

The existing TourismPackage infrastructure is present in Prisma and Ekoyini controllers.

The code previously enforced a 20% host-share ceiling. Founder direction supplied for the project says the share should not exceed 30%.

The implementation was changed to a 30% maximum.

This is a maximum, not a universal package price. Tourism pricing remains configurable per experience.

## Iziduko

The repository already contains the important ancestral identity fields:

- paternal Isiduko
- maternal Isiduko
- paternal grandmother's Isiduko
- maternal grandmother's Isiduko
- surname

Clan matching already compares the four ancestral lines and surname and ranks potential connections.

The implementation deliberately describes matches as potential ancestral connections rather than biological certainty.

The profile gate requires the four ancestral Isiduko fields and a profile image before viewing clan member matches.

No facial-recognition verification is claimed.

## Amaqhawe namaQhawekazi

The seed contains a substantial `LegendEntry` dataset. The current literal seed contains approximately 58 legend entries.

The verification protection already present in the repository was preserved:

- `VERIFIED`
- `TRADITIONAL_ATTRIBUTION`
- `DISPUTED`
- `PENDING_REVIEW`

Seed entries default to `PENDING_REVIEW`.

Public featured content is limited to `VERIFIED` and `TRADITIONAL_ATTRIBUTION`.

This is important because AI-generated cultural identity claims must not automatically become historical fact.

## Cultural checklist caution

The repository contains detailed ritual/sacred wording in `ceremonyCostProfiles.js`.

Those entries were not rewritten merely because they may require cultural review. The supplied code and handover were treated as the project's source material, and no new sacred ritual claims were invented in this pass.

Before iCamagu presents such content as authoritative generational cultural documentation, it should go through the planned community verification process.

## Supabase Storage

The repository already contains server-side Supabase Storage support.

Expected staging/server variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=ceremony-media`

The storage layout is user/portal scoped and media URLs are signed server-side.

The service-role key must never be committed to Git.

A private `ceremony-media` bucket must exist in the staging Supabase project.

## Pool buying / PSP

The schema already contains `PoolPayment` and the pool/order architecture.

The intended safety direction remains:

`Buyer → PSP → protected transaction/merchant flow → pool ledger/order confirmation → partner settlement → fulfilment`

Yoco and Peach Payments remain the intended PSP choices.

Real merchant credentials, contracts and webhooks are intentionally not invented or embedded in this codebase.

The current pool matcher is still a v1 matching engine. It reaches MOQ by total case count rather than a complete per-SKU MOQ model.

## Revenue infrastructure already represented

The codebase contains or provides infrastructure for:

1. bulk-buying supplier/partner margin
2. vendor/marketplace partnerships
3. Ekoyini Mobile Bar bookings
4. cultural tourism
5. tourism partner referrals
6. premium digital storage
7. sponsorships
8. institutional/cultural partnerships
9. verified vendor/service partnerships
10. future aggregated/anonymised insights, subject to privacy requirements

Core cultural functionality remains free.

## Seed data findings

The `seed.js` comment previously claimed 257 SKUs. The actual literal SKU array currently contains **256 SKU rows**. The README/comment has been corrected to 256.

The seed also contains:

- 2 sample bulk-buying partners
- 5 vendor/source records currently represented
- approximately 58 legend entries
- 40 clan seed records

No preset Stokvel records were found in the seed. The sample partners are infrastructure/test data, not user Stokvels.

## Validation performed

- All server-side and Prisma JavaScript files pass `node --check`.
- All route/controller named imports were checked against their exported controller functions.
- Modified JSX files were transpiled through the installed TypeScript parser successfully.
- The repository's `Activity.jsx` syntax problem was fixed.
- A full dependency/Vite/Prisma production build was not run because this audit environment does not contain the repository's installed `node_modules`/generated Prisma client.

## Files changed in this pass

- `README.md`
- `CHANGES_DEEP_AUDIT.md`
- `prisma/schema.prisma`
- `prisma/seed.js`
- `server/controllers/accountController.js`
- `server/controllers/activityController.js`
- `server/controllers/basketController.js`
- `server/controllers/ceremonyController.js`
- `server/controllers/contributionController.js`
- `server/controllers/ekoyiniController.js`
- `server/routes/basket.js`
- `server/routes/ceremony.js`
- `src/App.jsx`
- `src/pages/Activity.jsx`
- `src/pages/CeremonyHub.jsx`
- `src/pages/CeremonyPlanner.jsx`
- `src/pages/CeremonyTimeline.jsx`
- `src/pages/Ekoyini.jsx`
- `src/pages/EkoyiniQuoteForm.jsx`
- `src/pages/FamilyContributions.jsx`

## Not changed deliberately

- Yoco/Peach production credentials
- Supabase secrets
- production JWT secrets
- production database
- sacred cultural claims that require community verification
- broader social-network messaging/following architecture
- live tourism booking settlement
- real PSP money collection

Those remain separate implementation/configuration stages.

## Deployment rule

Do not deploy this directly to the production GitLab environment.

First apply it to the iCamagu staging Supabase/project environment, run the Prisma schema update, build the frontend, test authentication, ceremonies, Stokvel contributions, basket quantity updates, portal media uploads, and navigation, then promote only after the staging pass is clean.
