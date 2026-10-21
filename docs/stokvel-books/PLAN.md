# Transparent stokvel books for I-Camagu

(Imported from the Lovable project-hub repo. Planning document only; no code from that repo was merged.)

## Purpose
Give each stokvel a shared, accountable set of books, not another book controlled by three people. I-Camagu records and reports money movements; it does not receive, lend, transfer or hold the money, prescribe interest, or guarantee repayment.

Each stokvel chooses its contribution amount, grocery categories and allocations, contributing months, fundraising targets and lending terms. The R350 split, January-November cycle and 30% example are not imposed on other stokvels. Lending can be disabled.

## What exists today
The repository already has contributions, officials, payout approvals, loans, statements, bank-reference matching and an audit log. Gaps:
- Contribution confirmation can be done by one official; bank matching can confirm a contribution automatically.
- Loans use a one-time flat-interest calculation. The loan request falls back to 30%, which must be removed in favour of explicitly agreed stokvel terms.
- Repayments and lending-round records are separate from the central balance.
- The audit log has no hash chain; monthly member review and locking are not implemented.

## Member experience
Keep the existing Stokvels area. Add Books, My confirmations, Disputes, and Monthly close.

### 1. One shared financial record
- Record contributions, loan disbursements, repayments, grocery purchases, expenses, payouts, bank interest and fees.
- Every record shows date, amount, purpose, affected member, supporting reference, recorder, approver and status.
- Separate bank/cash from loans outstanding, earned interest, grocery allocations and member entitlements.
- Grocery allocations are budgeting labels, not duplicate cash receipts. Planned fundraising and interest are not shown as money collected.
- Members see approved records and exception summaries. Bank details, identity documents, signatures and sensitive dispute evidence are restricted.

### 2. Records cannot quietly change
- Submitted records and approvals stay in history; rejected submissions stay marked rejected.
- Posted entries cannot be edited or deleted. Correct with a linked reversing entry, a stated reason and, where needed, a replacement with fresh approval.
- Duplicate submissions and simultaneous approvals cannot count the same money twice.

### 3. Three separate duties
- A treasurer/maker records; a different authorised officer checks.
- A rotating ordinary member-auditor compares the month's books with bank evidence.
- No person holds two duties for the same period, approves their own entry or their own loan.
- Preserve any stricter existing approval threshold.
- Publish assignments and rotation dates. Role changes need member-visible approval and a recorded handover.
- Stokvels without enough eligible people may prepare records but cannot claim independent verification or close a month.

### 4. Same-day member confirmation
- Every submitted movement affecting a member creates an in-app notification with Correct and Dispute actions; later approvals and corrections notify again.
- Member confirmation is shown separately from officer approval and bank verification. Silence is never confirmation.

### 5. Disputes and forgotten debts
- Members can flag an incorrect entry or report a missing debt, attach evidence and track the outcome.
- Named or anonymous reporting from officers and members; a rotating member-ombud can see the identity. Not a promise of anonymity from platform administrators or lawful disclosure.
- Officers cannot appoint themselves ombud or investigate cases involving themselves.
- The named debtor confirms or contests. An allegation never auto-becomes a booked debt, fine or guilt finding.
- Accepted corrections follow the same independent approval and reversal process.
- Public summaries and AGM exports never reveal anonymous reporters.

### 6. Loans with agreed terms
- Replace the silent 30% default with configured, member-visible terms, including zero interest.
- State one-time, monthly or annual, and flat or reducing-balance. No inferred compounding, fees or penalties.
- Store agreed terms on each loan so later settings changes cannot rewrite it.
- Dated instalments, principal, interest, payments and balance to the cent; distinguish approval from disbursement.
- Member fundraising loans stay distinct from loans funded by stokvel money.

### 7. Monthly close
- Publish opening balances, receipts, payments, loans, closing balances, bank-versus-ledger comparison and discrepancies.
- Independent member-auditor and bank evidence required; manual uploads labelled as manual.
- Seven full days of member review from publication and notification. Material corrections create a new version and restart review.
- Lock only after the window, approvals and reconciliation. Unresolved discrepancies and accepted unresolved disputes block closing.
- Closed months are preserved; later corrections appear in an open period linked to the original.

### 8. AGM record and tamper evidence
- Export statement, detailed ledger, resolutions, role history and verification summary as PDF plus machine-readable records.
- Hash-chain audit events; publish period checkpoints. A hash chain detects changes against a trusted copy; it cannot prevent collusion or prove an entry is true.

## Delivery
1. Ledger, permission checks, explicit loan terms and regression tests.
2. Move every existing financial write path (including bank matching) onto the shared posting process.
3. Confirmations, disputes, protected evidence, role rotations.
4. Monthly close, hash verification, exports.
5. Run existing checks and financial-rule tests before merging.

Existing records must not be rewritten as if they had approvals they never received. Label them legacy and establish a member-reviewed opening position. Do not double-count during transition.

## Technical details
- Keep the Express/Prisma/PostgreSQL architecture.
- Versioned schema changes, transactional balanced double-entry postings, integer-cent arithmetic, unique idempotency keys, per-stokvel sequencing and period locks.
- Protect immutable posted lines and audit events at the database level; derive balances from posted entries.
- Enforce membership and permissions on every server action; restrict evidence and anonymous identity at the response boundary.
- Test: balanced postings, reversals, distinct duties, concurrent duplicates, exact instalment totals, no silent rate default, cross-stokvel denial, anonymous redaction, contested debts, and the seven-day boundary.
