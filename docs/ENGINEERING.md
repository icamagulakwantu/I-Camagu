# iCamagu — Engineering Reference

This is the internal reference for anyone building on iCamagu. The root [README.md](../README.md) is the pitch — what the platform is and why it matters. This document is the rules, stack, and operational detail that used to live there, moved here so the README could speak to partners and investors instead of contributors.

See also [`docs/ICAMAGU_IMPLEMENTATION_HANDOVER.md`](./ICAMAGU_IMPLEMENTATION_HANDOVER.md) for the detailed build history and full checklist inventory.

---

## Technology Stack

**Frontend:** React, Vite, Tailwind CSS — built as an installable PWA (offline banner, auto-updating service worker).

**Backend:** Node.js, Express.

**Database:** PostgreSQL via Prisma ORM. Prisma is the source of truth for the schema; this project has no migration history, so schema changes are applied directly against production and mirrored by hand into `schema.prisma` (see `server/scripts/ensure-schema.js` for the idempotent boot-time column checks that keep this safe).

**Infrastructure:** Supabase (database + storage), Render (hosting).

**Authentication:** JWT access/refresh token pairs, password auth, Google auth, OTP login, PIN-gated financial actions, rate limiting. Password-reset tokens are hashed and time-limited; password changes revoke existing refresh tokens; the forgot-password endpoint returns the same response whether or not an account exists, to avoid account enumeration.

**Email:** Resend.

**Payments:** No live payment gateway yet — pool payments today are manual EFT direct to a confirmed supplier, reconciled by reference number. Planned PSP integrations are Yoco and Peach Payments. Production payment credentials should only be introduced once the relevant commercial agreements and compliance requirements are complete — see "Pool Payment Architecture" below before touching this.

---

## Database

The schema's major domain areas: Users, Ceremonies (+ preparation plans, checklist items, cost items, timelines, templates), Stokvels (+ members, officials, contributions, payouts, ledgers), Iziduko/ClanMatch (+ connections), Products/SKUs, Baskets/Orders, Bulk pools (+ partners, payments, order confirmations), Cultural knowledge (Legends), Ceremony media, Notifications, Ekoyini services, Tourism packages, Directory (practitioners/vendors), Identity verification.

The database is the source of truth for dynamic data — frontend components should not hardcode entities that are meant to be user- or admin-managed.

---

## Pool Payment Architecture

Pooled customer funds should **not** simply be deposited into a partner's ordinary operating bank account — that creates counterparty risk (misuse, cash-flow problems, failure to fulfil, disputes, poor reconciliation).

Intended flow once a PSP is live:

```text
Buyer
  ↓
PSP
  ↓
Protected transaction / payment flow
  ↓
iCamagu pool ledger
  ↓
Order confirmation
  ↓
Partner settlement
  ↓
Fulfilment
```

Refund rules must be clearly disclosed before a user deposits money into a pool. Where a user requests a refund, the requester should bear the applicable refund/transaction cost where the final terms and PSP rules permit it — the exact fee structure must be communicated before payment.

---

## Codebase Rules

### Do

- Preserve existing component structure, naming conventions, and error-handling patterns.
- Reuse existing services, authentication, and Prisma models.
- Connect frontend calls to existing backend routes rather than duplicating them.
- Make dynamic data database-driven.
- Preserve cultural terminology and existing functionality.
- Add functionality incrementally.

### Do not

- Introduce unnecessary libraries.
- Create duplicate APIs.
- Hardcode database entities into frontend views.
- Replace existing architecture without a clear requirement.
- Create duplicate clan groups (join an existing one if the clan name already exists).
- Assume all ceremonies have identical requirements, or treat Inkomo as mandatory for every ceremony — livestock is a configurable ceremony resource, not a forced module.
- Treat AI-generated cultural information as automatically verified.
- Charge users simply to access the core cultural platform.
- Send pooled money directly into an ordinary partner operating account.

---

## Environment Variables

```text
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
NODE_ENV
RESEND_API_KEY
VITE_GOOGLE_CLIENT_ID
```

Additional production credentials will be needed as integrations activate: Supabase Storage, Yoco, Peach Payments, tourism partners, and other external services.

**Never commit production secrets to Git.**

---

## Staging and Production Safety

Production must stay isolated from experimental development — no unverified migrations, experimental payment flows, unfinished cultural content, destructive testing, or unverified seed changes against it. Validate changes against staging first.

Particular care is required for: database migrations, payment flows, Stokvel balances, payouts, authentication, media storage, and account deletion.

---

## Development Principles

> **Do not replace cultural complexity with oversimplified software.**

Where cultural practice is flexible, provide structure rather than impose an artificial rule. Where information is uncertain or disputed, allow verification and review. Where the schema already provides a feature, connect to it rather than building a duplicate hardcoded version.

Cultural knowledge must distinguish between established information, community-provided information, traditional attribution, disputed information, and information awaiting verification (`VERIFIED`, `TRADITIONAL_ATTRIBUTION`, `DISPUTED`, `PENDING_REVIEW`) — never presented as unquestionable fact merely because an AI system generated it.

Ceremony speakers and hierarchy should be treated as structure to assist a host, not a fully predetermined order — family elders, brothers, ootata, oomama, other family and community representatives may all speak depending on the ceremony.
