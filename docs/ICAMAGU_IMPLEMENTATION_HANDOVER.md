# iCamagu — Implementation & Architecture Handover

Date: 18 August 2026

This document accompanies the updated codebase. It records the implementation decisions used in this pass, the previous code sessions that have been integrated, the ceremony checklist inventory, cultural rules supplied by the founder, revenue/payment direction, and the remaining configuration needed before deployment.

## 1. Important baseline decision

The supplied ZIP was treated as the authoritative untouched repository baseline. The implementation continues the existing iCamagu architecture rather than replacing it with a new architecture or library stack.

**Previous two separate code sessions are included in this update. You do not need to go back and manually paste those snippets into the repository.**

Integrated previous-session work includes password reset, rate limiting, PIN reminder, account export/deletion, payout notification, stokvel announcements, bar booking endpoints, ErrorBoundary, the React entry-point wrapper, directory contact links, and related route/schema wiring.

## 2. Ceremony checklist inventory

The current authoritative default checklist registry in `server/controllers/ceremonyCostProfiles.js` contains **147 default checklist entries**: **143 specialised ceremony entries + 4 generic entries**. These are starter planning items, not a claim that a ceremony can only contain this many tasks. Hosts can now add household-specific/optional items.

| Ceremony | Default items |
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

### Exact current checklist entries

#### Ulwaluko — 24 items

1. **TRANSPORT ARRIVAL** — Arrange transport to the mountain
2. **TRANSPORT ARRIVAL** — Confirm elders/men accompanying
3. **PHYSICAL PREPARATION** — Head, facial, and pubic hair fully removed
4. **SPIRITUAL ITEMS** — Ikoto (bentonite clay)
5. **SPIRITUAL ITEMS** — Imphepho
6. **SPIRITUAL ITEMS** — Arrange uqiniswa komntwana (traditional healer)
7. **IBHOMA CONSTRUCTION** — Ingubo (blanket)
8. **IBHOMA CONSTRUCTION** — Sail/tarpaulin to cover ibhoma
9. **IBHOMA CONSTRUCTION** — Poles for structure
10. **IBHOMA CONSTRUCTION** — Cardboard for bedding base
11. **IBHOMA CONSTRUCTION** — Axe, knife, wire/cable ties, firewood
12. **IBHOMA CONSTRUCTION** — Courtesy: a bottle of brandy and beers for the builders
13. **DAILY ESSENTIALS** — Dish, cup, spoon
14. **DAILY ESSENTIALS** — 25L water container
15. **DAILY ESSENTIALS** — Matches, lamp/candles
16. **DAILY ESSENTIALS** — A book
17. **DIET EARLY STAGE** — No-salt food, steamed bread, spinach/cabbage
18. **DIET EARLY STAGE** — Green apples and low-water-content fruit
19. **UMOJISO** — Sheep (preferably with horns) for uMojiso
20. **UMOJISO** — Minimum 4 bottles of brandy, 2 cases of beer (1 bottle for peers)
21. **EXIT PREPARATION** — Fresh white blanket with black stripes
22. **EXIT PREPARATION** — Correct type of butter (confirm with family)
23. **IBHOMA CLOSURE** — Courtesy: 1-2 bottles of brandy and beers for closure team
24. **RETURN HOME** — Arrange transport home

#### Umgidi — 16 items

1. **ARRIVAL INGQONGQO** — Arrange Ingqongqo (women beating zinc, chanting)
2. **ARRIVAL INGQONGQO** — Courtesy: bottle of gin and brandy for the women
3. **KRAAL SEATING** — Ikhukho for the ikrwala to sit on
4. **KRAAL SEATING** — Small black tree branch from the initiation site
5. **ELDER GUIDANCE** — Arrange elder men for zoku yala guidance
6. **ELDER GUIDANCE** — Courtesy: bottle and beers for the elders
7. **COOKING EBUHLANTI** — Livestock for slaughter (choose sheep or another household-approved protein source)
8. **COOKING EBUHLANTI** — 9+ large enamel dishes, 6 cast iron pots
9. **COOKING EBUHLANTI** — 10+ bhekile for umqombothi
10. **COOKING KITCHEN** — Arrange women for kitchen station (general food)
11. **COOKING KITCHEN** — Plastic plates and spoons for guests
12. **HIERARCHY ALLOCATION** — Set up the 14-group hierarchy allocations (see Hierarchy tool)
13. **ALCOHOL DISTRIBUTION** — Main distribution supplies (5-8 bottles, 1-2 cases per group)
14. **ALCOHOL DISTRIBUTION** — Ingxotha (final round) supplies
15. **VIP EKOYINI** — Book Ekoyini Mobile Bar for VIP/friends phase
16. **CLOSURE** — Ukunxityiswa - new clothes and remaining alcohol for the next day

#### Intambo Enkulu — 25 items

1. **PLANNING ELDERS** — Convene family elders (Abadala bomzi) to confirm readiness for full ancestral binding
2. **PLANNING ELDERS** — Identify the lineage head who will perform Ukunqula and address the ancestors by name
3. **PLANNING ELDERS** — Formally request aunts (Oodade bobawo) and senior matriarchs to witness the binding
4. **PLANNING ELDERS** — Confirm the individual has undergone Imbeleko or equivalent first rite of passage
5. **PURPOSE BINDING** — Establish intent: Full ancestral recognition and binding (Ukubopheleleka) into the lineage
6. **PURPOSE BINDING** — Declare that this rite grants permission to enter Ekoyini, become Igwirha/Intlabi, and perform all rituals
7. **PURPOSE BINDING** — Set taboos (IzipALO) for the initiate during the binding period
8. **SUPPLIES SACRED** — Secure a white goat without blemish for the recognition slaughter
9. **SUPPLIES SACRED** — Gather white beads (Amaphondo) for the protective cord ceremony
10. **SUPPLIES SACRED** — Procure protective binding cords (Iintambo) from organic fibre as directed by elders
11. **SUPPLIES SACRED** — Prepare white clay (Ifutha) — NOT red ochre (Imbula) — for ritual marking
12. **SUPPLIES SACRED** — Collect ritual ash (Intlabathi) for ancestral invocation
13. **EXECUTION RITUAL** — Perform Ukuxhela: ritual throat-slitting of the goat by the lineage head at dawn
14. **EXECUTION RITUAL** — Collect blood in a traditional vessel for ancestral offering
15. **EXECUTION RITUAL** — Cut Intsonyama from the inside muscle of the right foreleg, roast without salt
16. **EXECUTION RITUAL** — Male kin eat Intsonyama first, then female kin, in strict order of seniority
17. **EXECUTION RITUAL** — Cook meat with water only — no salt, no spices — and consume before any other food
18. **BINDING CORDS** — Tie protective cords (Iintambo) around wrists/ankles while lineage head recites Ukunqula
19. **BINDING CORDS** — Affix white beads (Amaphondo) onto the cords as ancestral markers
20. **BINDING CORDS** — Apply Ifutha (white clay) markings to the initiate as seal of ancestral recognition
21. **BINDING CORDS** — Elders declare the individual now has full access to the Xhosa spiritual realm
22. **CLOSURE** — Dispose of ritual remains outside the homestead as directed by elders
23. **CLOSURE** — Instruct the newly bound individual on permanent taboos and responsibilities
24. **CLOSURE** — Brew Umqombothi for the binding ceremony
25. **CLOSURE** — Provide brandy and gin for elders and participants

#### Ukukhapha — 19 items

1. **PLANNING LINEAGE** — Confirm the specific male ancestor being accompanied (Utatomkhulu, Utata, or Inkulu)
2. **PLANNING LINEAGE** — Assemble senior paternal uncles (Ootatomkhulu/Amalume) to map the deceased journey narration
3. **PLANNING LINEAGE** — Verify all attendees have undergone Intambo Enkulu before entering the kraal
4. **PURPOSE TRANSITION** — Establish intent: Accompanying the male spirit (Isithunzi) into the ancestral realm (Ezweni lamathongo)
5. **PURPOSE TRANSITION** — Brief family on strict behavioural taboos (IzipALO) — no loud celebrations, no fermented drink
6. **KRAAL SACRIFICE** — Select male cow (Inkunzi) for the head of household, or white goat for ordinary male ancestor
7. **KRAAL SACRIFICE** — NEVER use a female cow (Inkomo yomfazi) for a male ancestor — strictly forbidden
8. **KRAAL SACRIFICE** — Cleanse the centre of the kraal (Intshonalanga yebuhlanti) for beast processing
9. **KRAAL SACRIFICE** — Lay grass mats (Ikhukho) inside the kraal for officiating elders
10. **RITUAL SLAUGHTER** — Perform Ukuxhela at dawn — lineage head slaughters the male animal
11. **RITUAL SLAUGHTER** — Cut Intsonyama from the right foreleg inside muscle, roast without salt
12. **RITUAL SLAUGHTER** — Serve Intsonyama to male kin first, then female kin, by seniority
13. **RITUAL SLAUGHTER** — Cook all ritual meat with water only — no salt, no spices
14. **RITUAL SLAUGHTER** — Meat must be consumed outside the homestead before any other food is eaten
15. **ANCESTRAL ADDRESS** — Lineage head performs Ukunqula, naming the deceased and requesting safe passage
16. **ANCESTRAL ADDRESS** — Collect blood and Intlabathi for ancestral offering
17. **CLOSURE RITUAL** — Perform Ukuxukuxa cleansing with goat, sheep, or fowl before family disperses
18. **CLOSURE RITUAL** — Brew Umqombothi for the ceremony
19. **CLOSURE RITUAL** — Provide brandy and gin for elders and participants

#### Inkobe zikaMama — 18 items

1. **PLANNING MATRIARCH** — Confirm the female ancestor (Umama, Utatomkhulu womfazi, or Inkulu yomfazi)
2. **PLANNING MATRIARCH** — Invite maternal side (Abakwazala / OoMalume) and matriarchs (Abafazi bomzi) to lead
3. **PLANNING MATRIARCH** — This ceremony is performed ONCE ONLY for a female ancestor — there is no Ukubuyisa for females
4. **PURPOSE TRANSITION** — Establish intent: Accompanying the female spirit to the realm of the ancestors
5. **PURPOSE TRANSITION** — Gather daughters and daughters-in-law (Abakhotshi) to organise women-led sections
6. **KRAAL SACRIFICE** — Select female cow (Inkomo ensikeni / Inkomo yomfazi) — NEVER a male cow for a female ancestor
7. **KRAAL SACRIFICE** — Perform Ukuxhela at dawn under direction of senior matriarchs and paternal elders
8. **KRAAL SACRIFICE** — Cut Intsonyama from the right foreleg, roast without salt, serve by seniority
9. **KRAAL SACRIFICE** — Cook meat with water only — no salt, no spices
10. **INKOBE PREP** — Procure high-quality whole dry white maize kernels (Inkobe)
11. **INKOBE PREP** — Boil Inkobe in large cast iron pots until perfectly cooked
12. **INKOBE PREP** — Prepare grass-woven baskets (Iintsuba / Izithebe) or pristine enamel bowls for serving
13. **COMMUNAL SHARING** — Distribute ritual meat portions into enamel dishes by seniority
14. **COMMUNAL SHARING** — Guests take handfuls of Inkobe as a sign of receiving the ancestor's blessings
15. **COMMUNAL SHARING** — Conclude with Izibongo (praise songs) honouring the maternal line
16. **CLOSURE** — Brew Umqombothi for the ceremony
17. **CLOSURE** — Provide brandy and gin for elders and participants
18. **CLOSURE** — NO Ukubuyisa follows this rite — the female ancestor is not brought back; she remains in the ancestral realm

#### Ukubuyisa — 20 items

1. **PLANNING RETURN** — Confirm the MALE ancestor whose spirit is mature enough to be brought home
2. **PLANNING RETURN** — Verify mourning period (Ukuzila) is complete — usually within one year
3. **PLANNING RETURN** — MALES ONLY — Ukubuyisa is NEVER performed for female ancestors in Xhosa tradition
4. **PURPOSE ENTHRONEMENT** — Establish intent: Bringing the male spirit home to brood over the family as guardian ancestor (Umkhulu)
5. **PURPOSE ENTHRONEMENT** — Prepare Ukunqula invocation prayers to welcome the ancestor back to the kraal
6. **SUPPLIES LIVESTOCK** — Procure male ox (Inkunzi) — male animal for male ancestor
7. **SUPPLIES LIVESTOCK** — NEVER use a female cow for Ukubuyisa — strictly forbidden
8. **KRAAL WELCOME** — Brew Umqombothi (50L to 100L) — this is a festive homecoming, fermented beer IS consumed
9. **KRAAL WELCOME** — Arrange Bhekile (traditional cans) for seamless serving of Umqombothi
10. **KRAAL WELCOME** — Set aside brandy and gin for elder men (modern courtesy)
11. **KRAAL WELCOME** — Prepare designated seating in the kraal (Ebuhlanti) by family hierarchy
12. **RITUAL EXECUTION** — Perform Ukuxhela on the male ox at dawn
13. **RITUAL EXECUTION** — Cut Intsonyama from the right foreleg, roast without salt, distribute by seniority
14. **RITUAL EXECUTION** — Cook celebratory meat in 6+ cast iron pots — some portions with salt for guests, ritual portions without
15. **RITUAL EXECUTION** — Lineage head performs Ukunqula calling the ancestor by name to return home
16. **RESTORATION CLOSURE** — Elder formally announces the ancestor is now Umkhulu — guardian seated at the kraal threshold
17. **RESTORATION CLOSURE** — Complete distribution of all remaining meat to extended family and neighbours — nothing is kept overnight
18. **RESTORATION CLOSURE** — Pour final libation of Umqombothi at the kraal gatepost for the ancestor
19. **RESTORATION CLOSURE** — Family may now invoke the ancestor by name in Imithandazo (prayers) and Imbeleko ceremonies
20. **RESTORATION CLOSURE** — Ukubuyisa is COMPLETE — the male ancestor now broods over the homestead permanently; never repeat for the same ancestor

#### Umsebenzi weGqirha — 21 items

1. **PLANNING HEALER** — Confirm the specific graduation stage with the practising Igqirha and fellow Amaqhirha
2. **PLANNING HEALER** — Verify the Igqirha has undergone Intambo Enkulu — prerequisite for all healer ceremonies
3. **PLANNING HEALER** — Confirm the ancestral dream (Iphupha) directing the specific ritual requirements
4. **PURPOSE DANCE** — Establish intent: Harmonising spiritual callings, ancestral alignment, and healing-path recognition
5. **PURPOSE DANCE** — Secure structural space for the drum-and-dance circle (Intlombe)
6. **SECLUSION RIVER** — Build reed seclusion hut (Ibhuma) by the river for Imfukamo overnight seclusion
7. **SECLUSION RIVER** — Place ritual items in the water for Abantu bomlambo — greet with "Camagu"
8. **SECLUSION RIVER** — Ancestor speaks during seclusion — observe all taboos strictly
9. **SECLUSION RIVER** — Destroy Ibhuma after seclusion is complete
10. **SUPPLIES SACRED** — Secure white goat without blemish as directed by the ancestral dream
11. **SUPPLIES SACRED** — Prepare white clay (Ifutha) for healer markings — NOT red ochre (Imbula)
12. **SUPPLIES SACRED** — Procure snuff (Isidlo / Isemfu) for spiritual protocols
13. **SUPPLIES SACRED** — Secure traditional leather drums (Ingqongqo / Amagomana) in working condition
14. **SUPPLIES SACRED** — Arrange trained drum beaters and singers versed in ancestral rhythms
15. **BREWING INTLOMBE** — Brew Umqombothi observing sacred purity instructions from the Igqirha
16. **BREWING INTLOMBE** — Serve Umqombothi in new billy can (Intsimbi emhlophe) — never used before
17. **BREWING INTLOMBE** — Secure courtesy gin, brandy, and matches for elder healers
18. **SLAUGHTER FEAST** — Perform Ukuxhela on the white goat
19. **SLAUGHTER FEAST** — Cut and distribute Intsonyama by healer seniority
20. **SLAUGHTER FEAST** — Cook meat in large pots for the feasting community
21. **SLAUGHTER FEAST** — Launch Intlombe: drum, sing, and dance through the night to celebrate graduation

#### Generic — 4 items

1. **PLANNING** — Set a date and guest estimate
2. **PLANNING** — Set a budget
3. **SUPPLIES** — Confirm meat/alcohol/livestock needs
4. **LOGISTICS** — Arrange venue/space

## 3. Ceremony architecture implemented

- Umgidi remains a standalone ceremony.
- Ulwaluko remains a standalone ceremony.
- The other supported ceremony types remain independently selectable.
- The existing 14-group hierarchy is preserved as the authoritative structure.
- Automatic creation of the 14 groups now occurs when an auto-generated ceremony is created.
- Each group receives a default seating order. Speaker order is deliberately not forced because the founder specified that speaking is partly spontaneous and hierarchy/elders determine who speaks.
- Ceremony checklist items can be added after creation and can be marked household-specific/optional.
- Ulwaluko timeline is now derived from the existing checklist and grouped into **Before the mountain / Mountain phase / After the mountain**.
- uMojiso remains part of the Ulwaluko process rather than becoming a separate ceremony type.
- Livestock is treated as a resource/choice rather than an Inkomo module. The Ulwaluko uMojiso starter guidance has been corrected to sheep rather than goat.
- Catering remains adaptable. The new custom checklist mechanism is intended for household differences such as kitchen-prepared chicken, meaty bones/beef chunks, starches, vegetables and salads, alongside meat prepared eziko.

## 4. Isiduko / Iziduko

Language rule: **Isiduko = singular; Iziduko = plural.**

The user profile now supports:

- paternal Isiduko
- maternal Isiduko
- paternal grandmother's Isiduko
- maternal grandmother's Isiduko

The existing unique `ClanGroup.clanName` constraint remains in place, so duplicate canonical clan groups cannot be created. Existing alias resolution remains conservative and does not fuzzy-match similar-looking clan names.

Clan matching now considers all four ancestral lines and surname similarity. Results are expressed as **potential ancestral connections**, not definitive claims of biological relation.

Clan member profiles are gated until the user has completed the four ancestral Isiduko fields and supplied a profile photo. This is a profile-completeness gate; the application does not claim to perform facial-recognition verification.

## 5. Amaqhawe namaQhawekazi and heritage knowledge

The existing `LegendEntry`/seed knowledge base was preserved. The safety problem identified by the founder is now addressed at the data-model/UI level:

- `verificationStatus` was added.
- New/current seed entries default to `PENDING_REVIEW` rather than being presented as verified historical fact.
- `sourceNote` was added.
- The public featured/Did You Know feed only uses `VERIFIED` or `TRADITIONAL_ATTRIBUTION` entries.
- The Legends screen visibly identifies entries that are pending community review.
- An admin verification endpoint was added.
- The fallback dashboard content no longer asserts potentially unverified people as Xhosa heroes.

Recommended verification statuses:

`VERIFIED` → supported by reliable historical/academic/archival evidence.

`TRADITIONAL_ATTRIBUTION` → preserved through accepted traditional/oral/community knowledge but not necessarily independently documented.

`DISPUTED` → evidence conflicts.

`PENDING_REVIEW` → not yet approved by the iCamagu knowledge/community process.

AI should be used to organise and summarise approved material, **not to decide someone's Xhosa identity or invent historical classification**.

## 6. Cultural tourism

Tourism remains a commercial experience rather than a paid core iCamagu subscription.

The package infrastructure now records the founder's direction including:

- usual Umgidi start time of 13:00
- traditional meat/food inclusion
- Umqombothi inclusion
- supervised photography
- Ekoyini-exclusive bar experience
- security
- optional transport
- optional entertainment
- initiate greeting experience
- minimum R100 stick offering
- permission-controlled access around the Ikrwala/endlwini yeSbane

The tourism system must preserve a strict distinction between public Umgidi experience and sacred/private practices. The software should never assume that everything connected to a ceremony is tourist-accessible.

Package pricing remains configurable per experience. There is deliberately no universal fixed tourism price in this pass.

## 7. Pool-buying money architecture

Users do not pay an iCamagu subscription or membership fee. The application is intended to remain free to users.

However, when a community pool actually buys goods, the money should **not** simply be deposited into a partner tavern's ordinary operating bank account.

Recommended flow:

`Buyer → PSP → protected transaction/merchant flow → pool ledger/order confirmation → partner settlement → fulfilment`

Both **Yoco and Peach Payments** are retained as the intended PSP options. The schema now includes a provider-neutral `PoolPayment` record so the payment layer can support either provider without redesigning the pool model.

Refund requests should display the refund-cost rule before payment. Where legally permissible and properly disclosed, a participant-requested refund cost can be charged to the requesting participant rather than silently reducing the group pool.

Live Yoco/Peach credentials and production merchant/webhook contracts are intentionally not embedded in this ZIP.

## 8. Supabase Storage

Supabase project URL supplied by the founder:

`https://nibinafvyxdtzoumgfgk.supabase.co`

The application now uses native server-side HTTP calls to Supabase Storage rather than adding another package.

Expected Render/server environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — **secret; never commit it**
- `SUPABASE_STORAGE_BUCKET=ceremony-media`

Recommended private storage layout:

`{userId}/{portalId}/{timestamp}-{safeFilename}`

Portal media is now stored as a storage path in Prisma and served through signed URLs. Media deletion is soft deletion so generational archive records are not silently destroyed.

## 9. Revenue model

iCamagu remains free to ordinary users.

Potential commercial streams:

1. Bulk-buying supplier/partner margin negotiated from volume discounts.
2. Vendor/marketplace commercial partnerships.
3. Ekoyini Mobile Bar bookings and service revenue.
4. Cultural tourism experience revenue.
5. Tourism partner commissions/referrals.
6. Premium digital archive/storage plans.
7. Sponsored heritage/education/tourism initiatives.
8. Institutional/cultural partnerships.
9. Verified vendor/service marketplace partnerships.
10. Future aggregated/anonymised economic/cultural insights — never selling users' personal or clan-identifying data.

Core cultural knowledge, clan information, seating guidance, traditional etiquette and educational heritage content should remain free because they are part of iCamagu's cultural-infrastructure mission.

## 10. Vendor sources added

The seed now recognises major sourcing categories including:

- Makro Liquor
- Preston's
- Navada
- Grasshopper
- Delbro

These are seeded as vendor/source records, not as claims that iCamagu has a commercial agreement with those businesses.

## 11. Security and communication fixes

- `requireAuth` now exposes both `req.user` and `req.userId`, matching the conventions already used throughout the controllers.
- Password reset uses a SHA-256 token hash and a 30-minute expiry.
- Password reset invalidates existing refresh tokens.
- Password-reset responses do not disclose whether an email exists.
- Authentication endpoints have rate limiting.
- Ceremony read/update/delete/checklist/cost operations enforce host ownership where appropriate.
- Stokvel announcements are restricted to officials for posting and members for reading.
- Account deletion preserves auditable financial records through anonymisation and blocks deletion when the user still has official responsibility over a positive stokvel balance.

## 12. Files created

- `server/controllers/accountController.js`
- `server/controllers/announcementController.js`
- `server/middleware/rateLimiter.js`
- `server/routes/account.js`
- `server/services/storageService.js`
- `src/components/ErrorBoundary.jsx`
- `src/components/PinReminder.jsx`
- `src/pages/AccountSettings.jsx`
- `src/pages/Help.jsx`
- `src/pages/ResetPassword.jsx`

## 13. Existing files modified

- `env.example`
- `prisma/schema.prisma`
- `prisma/seed.js`
- `server/controllers/authController.js`
- `server/controllers/ceremonyController.js`
- `server/controllers/ceremonyCostProfiles.js`
- `server/controllers/ekoyiniController.js`
- `server/controllers/hierarchyController.js`
- `server/controllers/izidukoController.js`
- `server/controllers/legendController.js`
- `server/controllers/payoutController.js`
- `server/controllers/portalController.js`
- `server/controllers/userController.js`
- `server/index.js`
- `server/middleware/auth.js`
- `server/routes/auth.js`
- `server/routes/ceremony.js`
- `server/routes/ekoyini.js`
- `server/routes/legend.js`
- `server/routes/portal.js`
- `server/routes/stokvel.js`
- `server/services/izidukoService.js`
- `server/services/notificationService.js`
- `src/App.jsx`
- `src/components/DidYouKnow.jsx`
- `src/main.jsx`
- `src/pages/CeremonyPlanner.jsx`
- `src/pages/Directory.jsx`
- `src/pages/IzidukoNetwork.jsx`
- `src/pages/LegendsExplore.jsx`
- `src/pages/Login.jsx`
- `src/pages/More.jsx`
- `src/pages/Portal.jsx`
- `src/pages/Profile.jsx`
- `src/pages/Stokvels.jsx`

## 14. Validation performed

- Server-side JavaScript files passed `node --check`.
- `prisma/seed.js`, ceremony cost profiles and hierarchy controller passed JavaScript syntax checks.
- Modified JSX files were transpiled through the installed TypeScript parser successfully.
- The repository's pre-existing `src/pages/Activity.jsx` contains unrelated JSX parse errors in the supplied baseline; it was not introduced by this pass.
- Full Vite/Prisma production validation could not be completed in this environment because the repository had no installed `node_modules` and the dependency installation/Prisma CLI retrieval timed out.

## 15. Deployment configuration still required

Before deploying the updated ZIP, add the Supabase Storage secret to Render and create the `ceremony-media` bucket with the intended private policy.

Do not paste the service-role key into chat, Git, the ZIP, or `env.example`.

After deployment, run the existing Prisma database push/migration process so the new fields/models are created.

## 16. What this pass deliberately does NOT invent

- No new Xhosa ceremonies were invented.
- No new sacred ritual instructions were invented.
- No person was automatically declared Xhosa because an AI model guessed it.
- No Inkomo requirement was imposed on every ceremony.
- No user subscription fee was introduced.
- No user clan relationship was declared as biological fact.
- No social-network architecture was forced into the current build; the initial Iziduko discovery layer is implemented while the broader social layer remains future work.