# iCamagu

### Culture before capital. Plan — together.

iCamagu is a cultural infrastructure platform designed around Xhosa ceremony planning, Iziduko identity, community organisation, Stokvels, collective bulk buying, cultural education, and cultural tourism.

The platform is designed to keep the core cultural layer free and accessible while creating sustainable revenue through infrastructure, marketplace, partner, tourism, storage, sponsorship, and institutional services.

*This document is the internal product spec and architecture reference. For the investor/partner-facing pitch, see [`docs/PITCH.md`](./docs/PITCH.md).*

## 2026 Money-Handling Policy

**For the remainder of 2026, iCamagu will not receive, hold, pool, custody, or transfer users' money.** This applies to Stokvels, SmartMatch bulk purchases, ceremony-related purchases, and marketplace transactions. Actual payments must be made manually and directly by users to the relevant merchant or intended recipient, outside iCamagu.

During this phase, iCamagu may record budgets, contribution declarations, expenses, payment references, receipts, supplier quotes, and confirmation/dispute status. These are records only: entering a payment reference or marking a record as submitted must never be treated as proof that funds were received. Confirmations must be attributable to an authorised person, and changes must remain auditable. The app must not initiate charges, collections, payouts, transfers, or automated refunds.

The intended commercial model is to earn transparent platform/service fees and contractually agreed merchant-funded rebates, commissions, or negotiated benefits. Where feasible, negotiated savings should benefit users under clearly disclosed terms. iCamagu must not disguise user funds as platform revenue or treat a merchant rebate as received until it is contractually due and verified.

**Future payment-provider integration is deferred until 2027 at the earliest**, and is conditional on the business bank account, merchant and provider contracts, legal/compliance review, and technical verification being complete. Any future provider-mediated payment/split-settlement flow must be approved in writing by the provider and advisers, must not make iCamagu the custodian of stokvel or purchase funds, and must clearly define the legal recipient/controller of funds, merchant settlement, platform fees, rebates/commissions, refunds, disputes, chargebacks, and reconciliation. Do not describe a provider arrangement as “escrow” unless the provider contract and legal review confirm that it is genuinely an escrow arrangement.

This is a product and operational constraint, not merely a payment-integration milestone. Payment features must remain disabled for real-money use until the future launch gate is explicitly approved.

---

---

## 1. What is iCamagu?

iCamagu is being developed as digital infrastructure for Xhosa communities.

The platform brings together:

- Xhosa ceremony planning
- Ulwaluko planning
- Umgidi planning
- Ceremony checklists
- Ceremony hierarchy and seating
- Ceremony responsibilities and delegation
- Speaker structure
- Iziduko identity and clan matching
- Family and community connections
- Stokvels
- Community savings and contributions
- Collective bulk buying
- Alcohol and livestock marketplace infrastructure
- Vendor and partner matching
- Ceremony media and digital storage
- Xhosa history and cultural education
- Amaqhawe namaQhawekazi
- Cultural tourism
- Ekoyini Mobile Bar experiences
- Future social/community features

The core principle is:

> **Culture before capital.**

iCamagu is intended to be infrastructure first, not simply another commercial marketplace.

---

## 2. Core Product Areas

### Ceremony Engine

The Ceremony Engine is one of the core systems of iCamagu.

Ceremonies are treated as independent planning experiences rather than forcing every ceremony into the same workflow.

The current documented ceremony structures include:

- Ulwaluko
- Umgidi
- Intambo Enkulu
- Ukukhapha
- Inkobe zikaMama
- Ukubuyisa
- Umsebenzi weGqirha
- Wedding
- General Event (custom/other ceremony planning)

Ulwaluko, Umgidi, Intambo Enkulu, Ukukhapha, Inkobe zikaMama, Ukubuyisa, and Umsebenzi weGqirha each have their own default checklist and cost profile (see section 3). Wedding and General Event currently use the same generic planning structure rather than a dedicated checklist/cost profile of their own.

The system is designed so ceremony knowledge can continue to grow through community engagement and verified cultural documentation.

Where practices vary between families, homes, regions or communities, the system should provide structured guidance while allowing the host to add or modify planning items.

---

## 3. Ceremony Checklists

The current implementation documentation identifies **147 default checklist entries**.

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

These are default planning structures, not intended to prevent families from adding their own requirements.

Each checklist item — default or custom — can carry a real cost: an optional target/estimate, and an actual amount once known. This matters because plenty of real ceremony costs are not a priced catalogue item at all (a lift to the mountain in a friend's bakkie for exactly R200 of petrol has no SKU and no fixed price) — the cost is entered directly against the item, never hardcoded or guessed, and a running total of what's been logged is shown against the checklist.

The checklist system is intended to support:

- Default ceremony items
- Custom items
- Real per-item cost tracking (target and actual)
- Item completion
- Responsibility assignment
- Ceremony-specific variations
- Future community-reviewed knowledge additions

---

## 4. Ulwaluko

Ulwaluko is treated as a standalone ceremony/planning experience.

The current planning structure recognises three broad phases:

### Before the mountain

Preparation and family planning before the initiate enters the mountain phase.

### Mountain phase

Planning and responsibilities associated with the mountain period.

### After the mountain

Preparation for the return and the post-mountain celebration.

Umgidi is not simply another Ulwaluko checklist item. It is treated as a standalone celebration and planning experience.

---

## 5. Umgidi

Umgidi is a standalone ceremony experience within iCamagu.

It is particularly important because it is a major celebration and a significant area of household and community expenditure.

Planning can include:

- Guest planning
- Family hierarchy
- Seating
- Speakers
- Food
- Traditional meat
- Starch
- Vegetables and salads
- Beverages
- Umqombothi
- Alcohol service
- Entertainment
- Security
- Transport
- Photography
- Ceremony responsibilities
- Tourism
- Budgeting

The documented cultural tourism architecture currently uses **13:00 as the usual Umgidi start time**.

---

## 6. Ceremony Hierarchy

The application contains an existing **14-group Xhosa ceremony hierarchy**.

This hierarchy is treated as an authoritative structural component of the application.

It can be used to generate:

- Seating structures
- Seating maps
- Responsibilities
- Delegation lists
- Speaking structures
- Ceremony preparation views

The system should provide structure without pretending that every ceremony follows a completely predetermined speaking order.

Ceremony speakers may include:

- Family elders
- Brothers
- Ootata
- OoMama
- Other family representatives
- Community speakers
- Other appropriate speakers according to the circumstances of the ceremony

The system can assist the host by providing a structured framework while allowing speakers and responsibilities to be adjusted manually.

---

## 7. Livestock

Livestock is treated as a ceremony resource rather than a separate "Inkomo module".

Ceremonies can involve different livestock requirements.

Examples include:

- Inkomo
- Igusha
- Bhokhwe
- Other appropriate livestock depending on the ceremony and cultural requirements

The application must not assume that every large ceremony requires Inkomo.

The system therefore supports configurable livestock planning rather than blocking ceremonies around a single animal.

---

## 8. Iziduko

### Isiduko — singular
### Iziduko — plural

Iziduko form a major identity layer of iCamagu.

The current architecture supports clan identity information including:

- Paternal clan
- Maternal clan
- Paternal grandmother's clan
- Maternal grandmother's clan
- Surname
- Ancestral relationships

The matching system is intended to help users discover possible family and ancestral relationships.

Potential relationship-strength indicators include:

- Paternal relation
- Maternal relation
- Paternal + surname
- Maternal + surname
- Paternal + maternal
- Paternal + maternal + surname

These should be presented as relationship indicators, not proof of biological relationship.

---

## 9. Clan Registration

Clan groups are protected against unnecessary duplication.

Where a clan name already exists in the system, users should join the existing clan group rather than creating an identical duplicate.

Users must complete their own clan registration before gaining access to other clan members' profiles.

The current direction also requires a facial/profile image before viewing clan-member profiles.

The social layer is intended to grow gradually.

Potential future functionality includes:

- People-you-may-know
- Possible relatives
- Sibling/family connection requests
- Following
- Messaging
- Family groups
- Clan groups
- Community groups
- WhatsApp sharing

---

## 10. Amaqhawe namaQhawekazi

iCamagu includes a cultural knowledge and pride layer for **Amaqhawe namaQhawekazi**.

This area can contain verified information relating to Xhosa:

- Heroes
- Heroines
- Historical figures
- Political figures
- Academic figures
- Sporting figures
- Artists
- Cultural figures
- Other important contributors

Cultural identity information must not be automatically treated as verified merely because an AI system generated it.

The implementation supports verification states including:

- `VERIFIED`
- `TRADITIONAL_ATTRIBUTION`
- `DISPUTED`
- `PENDING_REVIEW`

---

## 11. Stokvels

Stokvels form another core infrastructure layer.

The system supports:

- Stokvel creation
- Membership
- Officials
- Contributions
- Ledgers
- Payouts
- Approvals
- Notifications
- Announcements
- PIN-secured financial actions
- Accountabilities and financial records

Financial records are designed to remain auditable.

Stokvel deletion is restricted where real funds remain.

---

## 12. Collective Bulk Buying

iCamagu is collective purchasing and negotiation infrastructure. This is implemented, not just planned.

### The Store

The Store is organised into five departments: Drinks, Meat & Livestock, Groceries, Supplies (ceremony/ritual items), and Clothing. It is a real, priced catalogue, not a mockup — most SKUs carry a real researched supplier price, and unpriced rows are marked as not-yet-orderable rather than hidden or given an invented price.

### Pool matching

A member does not choose which outlet or distributor their order pools with — that decision depends on facts the app has and the member doesn't (who's nearby, what category the item is, which pool is already closest to its bulk-pricing minimum), so the platform matches automatically. There is no manual partner picker.

Every item belongs to one of four real supplier categories, matching the actual tier-2 suppliers the platform buys from:

- **Tavern** — alcohol and drinks (e.g. Makro, Big Daddy's, United Distributors, Ultra, Bluebottle).
- **Butchery** — meat and livestock (farms and livestock suppliers).
- **Grocery** — groceries and dry goods (e.g. Makro, Springbok, Jumbo/Massmart).
- **Produce** — fresh produce (farmers, Food Lover's Market, Markman Fruit & Veg Depot).

A basket that mixes categories (drinks and groceries in one cart) splits into a separate pool per category on submission, since a pool is always one category and one area.

**Pool formation is fully decoupled from having a confirmed supplier.** Which real distributor eventually fulfils a pool is a background business relationship, not something a member is ever blocked on — a pool can be created, joined, and reach its bulk-pricing minimum with no partner attached yet. Once a real partner relationship exists for that category and area, it attaches automatically (best-effort, never a gate) and appears to members as a "confirmed supplier" badge — shown as a credibility signal and free marketing for the partner, not a requirement to participate.

Each pool shows a live tiered discount ladder, so members can see exactly how close the group is to the next real price break, and can invite others (e.g. via WhatsApp) to help clear it. A pool's expiry is solely the target date whoever started it chose (e.g. "this is for December") — not a fixed universal timer — so a pool can stay open for as long as it genuinely needs to.

### Demand visibility

An admin dashboard aggregates real pooled demand by category — pool count, cases, Rand value, member count — across every open and matched pool, including pools with no confirmed supplier yet. This turns pooled demand into the real negotiating number needed in a supplier conversation (e.g. "we already have R14,000 of alcohol orders ready in this area"), and gives a one-click way to attach a real partner to a pool once a deal is signed.

The goal is to combine community demand so buyers can access negotiated bulk pricing.

The platform is not intended to charge ordinary users simply for participating.

---

## 13. Pool Payment Architecture

### 2026 policy: no custody or in-app money movement

For the remainder of 2026, iCamagu must not receive, hold, pool, custody, or transfer customer or Stokvel money. Members pay the confirmed merchant directly using an agreed method outside the app. The app may coordinate demand and orders and maintain manual records, but a recorded reference is not proof of payment. A payment can be marked confirmed only by an authorised person using evidence appropriate to the workflow; disputes and corrections must remain auditable.

Do not route members' money through iCamagu's own operating bank account, and do not rely on an ordinary merchant account as a substitute for a protected payment arrangement. No live payment gateway, automated collection, payout, split settlement, or refund processing is authorised for the 2026 launch.

### Intended future commercial/payment model

iCamagu's revenue model is platform/service fees plus contractually agreed merchant-funded rebates, commissions, or negotiated commercial percentages. Where negotiated discounts or rebates are intended to benefit members, the terms and calculation must be transparent. Merchant funds, platform fees, and any rebate/commission must be accounted for separately and must not be represented as received before settlement is verified.

A future provider-mediated flow may be considered in 2027 or later only after the business bank account, provider and merchant contracts, legal/compliance review, and technical validation are complete. A proposed provider must confirm in writing that its product supports the exact merchant settlement and fee/rebate allocation model. Do not assume PayFast, Ozow, PayPal, or another provider offers escrow or the required split-settlement arrangement simply because it processes payments. Do not call a flow “escrow” unless the contractual product and legal review substantiate that description.

Before enabling any future payment integration, document:
- Who legally receives and controls funds at every step, and how iCamagu avoids custody of user/Stokvel money.
- Merchant settlement, platform fees, rebate/commission terms, refunds, cancellations, chargebacks, disputes, and reconciliation.
- Provider approval, business banking requirements, applicable South African legal/regulatory obligations, and a tested rollback/incident plan.
- A staging-only end-to-end test and explicit founder approval.

Until those gates are passed, SmartMatch pools and Stokvels are coordination and recordkeeping tools only. Users pay merchants or intended recipients directly outside iCamagu.

---

## 14. Refunds

For the 2026 manual-payment phase, iCamagu does not process refunds or move funds. Any refund or repayment is arranged directly between the merchant and the customer (or the relevant parties) outside iCamagu, in line with their disclosed terms and applicable law. The app may record a refund request, evidence, status, and the parties' confirmations, but it must not imply that money has been returned merely because a request is logged or marked approved.

Any future provider-mediated refund/split-settlement workflow is deferred until the payment launch gate is approved. Applicable provider rules, contract terms, refund costs, consumer disclosures, and responsibility for execution must be verified before activation.

---

## 15. Vendors and Marketplace

The pool-matching architecture (section 12) is built around four real supplier categories — every Store item and every bulk pool belongs to exactly one:

### Tavern (alcohol and drinks)

Tier-2 suppliers/distributors, e.g.:

- Makro Liquor
- Big Daddy's
- United Distributors
- Ultra
- Bluebottle
- Other liquor stores and distributors

### Butchery (meat and livestock)

- Farms and livestock suppliers
- Other meat suppliers

### Grocery (groceries and dry goods)

- Makro
- Springbok
- Jumbo (Massmart)
- Other grocery suppliers

### Produce (fresh produce)

- Farmers
- Food Lover's Market
- Markman Fruit & Veg Depot
- Other produce suppliers

### Ceremony clothing

A fifth Store department with no dedicated pool-matching category of its own yet. Examples of future suppliers include:

- Navada
- Grasshopper
- Delbro
- Other formal and traditional clothing suppliers

### Other future suppliers

- Catering providers
- Transport providers
- Entertainment providers
- Security providers
- Tourism partners

A partner listed under one of the four pool-matching categories is a real, confirmed business relationship — established partners are shown to members as a credibility signal once attached to a pool, never as a requirement to form or join one (section 12). Vendor relationships should be represented as infrastructure/partner relationships rather than hardcoded assumptions.

---

## 16. Cultural Tourism

Cultural tourism is a major potential revenue stream and a strategic part of iCamagu.

The tourism experience is intended to allow visitors to experience an Umgidi celebration while respecting the family and cultural environment.

The documented experience can include:

- Arrival for the Umgidi
- Traditional meat cooked eziko
- Umqombothi
- Traditional alcohol presentation
- Supervised photography
- Greeting the initiate
- Visiting the appropriate initiate area
- Holding the stick with the required contribution
- Viewing the cultural setting
- Sitting around the ikrwala where permitted
- Local guides
- Security
- Transport
- Entertainment

The current documented experience specifies that visitors should carry at least **R100** for the stick experience.

The tourism experience is intended to be an **Ekoyini Mobile Bar exclusive** experience.

It can combine:

- Bar service
- Cultural tourism
- Security
- Transport
- Entertainment
- Local guides
- Ceremony coordination

Not every location will qualify. Location selection must consider community acceptance, safety, crime levels, transport, security, family approval, and cultural appropriateness.

---

## 17. Ceremony Media and Storage

Ceremony media is part of the platform infrastructure.

The architecture supports private ceremony media storage using Supabase Storage.

The intended storage system supports:

- Ceremony photographs
- Videos
- Albums
- Private family media
- Controlled access
- Future premium storage

Storage must respect privacy and ceremony-specific permissions.

Not every ceremony or cultural moment should automatically be treated as public content.

---

## 18. Account and Privacy

The application includes account privacy functionality including:

- Data export
- Account deletion
- Financial-record preservation
- Anonymisation
- Session revocation

Users can request a copy of their personal data.

Account deletion follows a soft-delete/anonymisation approach where financial records must remain auditable.

---

## 19. Authentication and Security

Authentication uses:

- Access tokens
- Refresh tokens
- Password authentication
- Google authentication
- OTP functionality
- Password reset
- PIN security
- Rate limiting

Password-reset tokens are hashed before storage and expire after a limited period.

Password changes revoke existing refresh tokens.

Financial actions use additional PIN protection.

---

## 20. Password Recovery

The authentication system supports:

```text
Forgot Password
      ↓
Email reset request
      ↓
Hashed reset token
      ↓
Time-limited reset link
      ↓
New password
      ↓
Existing sessions revoked
```

The password-reset endpoint deliberately uses the same public response whether or not an account exists, reducing account-enumeration risk.

---

## 21. Notifications

iCamagu supports notification infrastructure for important events.

Examples include:

- Payout cleared
- Stokvel announcements
- Other future financial/community notifications

Notifications may be delivered through:

- In-app notifications
- Email

---

## 22. Ceremony Knowledge Engine

The Ceremony Knowledge Engine is intended to become long-term cultural knowledge infrastructure.

The current knowledge base should be treated as a starting point.

The system is designed to grow through:

- Community engagement
- Cultural documentation
- Verified contributions
- Ceremony experience
- Community initiatives
- Future research
- Review of disputed information

The objective is to preserve useful cultural knowledge for future generations without presenting unverified information as unquestionable fact.

---

## 23. Revenue Model

The core cultural functionality is intended to remain free for users.

Potential revenue streams include:

- Bulk-buying infrastructure and negotiated supplier spreads (tavern, butchery, grocery, and produce categories are all live — section 12)
- Vendor marketplace relationships
- Alcohol marketplace margins
- Livestock marketplace economics
- Grocery and produce marketplace economics
- Future clothing marketplace economics
- Ekoyini Mobile Bar services
- Cultural tourism packages
- Tourism referrals
- Premium digital storage
- Corporate and community sponsorships
- Institutional partnerships
- Appropriate aggregated/anonymised insights, subject to privacy requirements

---

## 24. User Pricing Philosophy

The current product direction is:

> **Users should not pay to use the core iCamagu platform.**

This includes the cultural infrastructure and Stokvel functionality.

Revenue should primarily come from the infrastructure surrounding the community rather than charging ordinary users for access to their culture.

Potential premium functionality, such as additional digital storage, can be offered separately.

---

## 25. Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Installable PWA (offline-aware, auto-updating service worker — see `src/lib/appUpdate.js`)

### Backend

- Node.js
- Express

### Database

- PostgreSQL
- Prisma ORM

### Infrastructure

- Supabase (database + storage)
- Supabase Storage
- Render (hosting)

### Authentication

- JWT access and refresh token architecture
- Password authentication
- Google authentication
- OTP
- PIN security

### Email

- Resend

### Payments

Planned PSP integrations:

- Yoco
- Peach Payments

Production payment credentials should only be introduced once the relevant commercial agreements and compliance requirements are complete.

---

## 26. Database

Prisma is the central database schema.

The schema contains the application's major domain structures, including:

- Users
- Ceremonies
- Preparation plans
- Checklist items
- Stokvels
- Stokvel members
- Officials
- Contributions
- Payouts
- Ledgers
- Products (SKUs)
- Baskets / Orders
- Bulk pools (partner attachment is optional — a pool always knows its own category, independent of whether a confirmed supplier is attached; see section 12)
- Suppliers/partners
- Iziduko / ClanMatch connections
- Cultural knowledge (Legends)
- Ceremony media
- Notifications
- Directory (practitioners and vendors)
- Identity verification
- Ekoyini services
- Tourism-related infrastructure

The database should remain the source of truth for dynamic application data.

Frontend components should not hardcode database entities that are intended to be user- or admin-managed.

This project currently has no formal migration history — schema changes are applied directly against the production database and mirrored by hand into `schema.prisma`, with idempotent boot-time column checks (`server/scripts/ensure-schema.js`) as the safety net. This should be kept in mind before assuming a standard `prisma migrate` workflow applies.

---

## 27. Development Principle

iCamagu is a living platform.

Future development must preserve the following principle:

> **Do not replace cultural complexity with oversimplified software.**

Where cultural practice is flexible, the application should provide structure rather than impose an artificial rule.

Where information is uncertain or disputed, the system should allow verification and review.

Where the schema already provides a feature, frontend and backend implementation should communicate with it rather than creating duplicate hardcoded versions.

---

## 28. Codebase Rules

Future development should follow the existing project style.

### Do

- Preserve existing component structure
- Preserve existing naming conventions
- Preserve existing error-handling patterns
- Reuse existing services
- Reuse existing authentication
- Reuse existing Prisma models
- Connect frontend calls to existing backend routes
- Make dynamic data database-driven
- Preserve cultural terminology
- Preserve existing functionality
- Add functionality incrementally

### Do not

- Introduce unnecessary libraries
- Create duplicate APIs
- Hardcode database entities into frontend views
- Replace existing architecture without a clear requirement
- Create duplicate clan groups
- Assume all ceremonies have identical requirements
- Treat Inkomo as mandatory for every ceremony
- Treat AI-generated cultural information as automatically verified
- Charge users simply to access the core cultural platform
- Send pooled money directly into an ordinary partner operating account

---

## 29. Cultural Data Principle

iCamagu is intended to become a long-term cultural knowledge resource.

Because cultural information can differ between:

- Families
- Communities
- Regions
- Generations
- Ceremony contexts

the platform must distinguish between:

- Established information
- Community-provided information
- Traditional attribution
- Disputed information
- Information awaiting verification

Cultural knowledge must be handled respectfully.

---

## 30. Development and Deployment

The project uses separate environments for safe development and production operation.

Production must not be used for experimental schema changes or untested payment functionality.

New features should first be tested against staging.

Particular care is required for:

- Database migrations
- Payment flows
- Stokvel balances
- Payouts
- Authentication
- Media storage
- Account deletion

---

## 31. Environment Variables

The application uses environment variables for secrets and external services.

Examples include:

```text
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
NODE_ENV
RESEND_API_KEY
VITE_GOOGLE_CLIENT_ID
```

Additional production credentials may be required as integrations are activated, including:

- Supabase Storage
- Yoco
- Peach Payments
- Tourism partners
- Other external services

**Never commit production secrets to Git.**

---

## 32. Staging and Production Safety

The production iCamagu environment must remain isolated from experimental development.

The production database and credentials should not be used for:

- Unverified migrations
- Experimental payment flows
- Unfinished cultural content
- Destructive testing
- Unverified seed changes

Staging should be used to validate changes before production deployment.

---

## 33. Project Direction

The current product direction prioritises:

1. Iziduko
2. Umgidi planning
3. Ceremony Engine
4. Pool buying
5. Ulwaluko
6. Cultural tourism
7. Xhosa cultural education
8. Amaqhawe namaQhawekazi
9. Community/social infrastructure
10. Marketplace infrastructure

These areas form the core identity of iCamagu.

---

## 34. Implementation Status

iCamagu is an active development project.

Some systems are implemented, some are partially implemented, and others are planned for future development.

The Prisma schema, existing source code, implementation handover documentation, and verified cultural requirements should be consulted before making major architectural changes.

When functionality exists in the schema but is not yet exposed in the frontend, the preferred approach is to connect the existing infrastructure rather than recreate the feature using hardcoded frontend data.

---

## 35. Cultural Integrity

iCamagu is intended to preserve and strengthen Xhosa cultural knowledge for present and future generations.

The platform should therefore:

- Respect living cultural practice
- Allow community variation
- Avoid unnecessary assumptions
- Protect sensitive information
- Clearly distinguish verified and unverified knowledge
- Preserve the role of families and communities
- Avoid turning cultural practices into rigid software rules
- Use technology to support preparation rather than replace cultural authority

---

## 37. Development and Deployment Workflow

GitHub is the source of truth for code, branches, pull requests and CI. Render is the only production deployment platform. Do not use StackBlitz, Bolt, or another hosted code workspace as an editing or deployment target for iCamagu. See [the development workflow policy](./docs/DEVELOPMENT_WORKFLOW.md) and [launch-readiness gates](./docs/LAUNCH_READINESS.md).

Merging to `main` triggers Render auto-deploys. Verify the deployed commit and runtime logs after every production merge. Do not disable either existing Render service until the canonical domain, database target, environment settings and callbacks have been confirmed.

---

## 36. Long-Term Vision

iCamagu is intended to become more than a ceremony planner.

The long-term vision is a connected cultural infrastructure where Xhosa people can:

- Plan ceremonies
- Organise families
- Understand their Iziduko
- Discover possible ancestral connections
- Coordinate seating and responsibilities
- Manage Stokvels
- Pool purchasing demand
- Negotiate better prices
- Access vendors
- Preserve ceremony memories
- Learn verified Xhosa history
- Celebrate Amaqhawe namaQhawekazi
- Participate in cultural tourism
- Support local economic activity
- Preserve cultural knowledge for future generations

The platform's social and community layer can expand gradually as the underlying cultural infrastructure becomes stronger.

---

# Culture before capital.

## Plan — together.

**iCamagu**
