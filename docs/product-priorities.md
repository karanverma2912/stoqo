# Stoqo improvement priorities

This proposal was written before the native-app work. As of 14 October, account
recovery/verification, field-level cost permissions, hold/resume bills, supplier
restocking, daily summaries and customer history have implementations in source.
The native/server launch is active again; live deployment and provider verification
still have the blockers listed in production-status.md. Push source work without
waiting for GitHub builds. The remaining items below are improvements, not a claim
that every item has been completed.

## Fix and finish current flows first

1. Account recovery, email verification and real invitation delivery, with resend,
   expiry and clear success/failure states. Recovery and verification code exist;
   real delivery needs a provider key and verified sender.
2. Audit field-level permissions as well as endpoint access. Product serialization
   restricts purchase prices by role; keep checking those boundaries as features grow.
   Keep staff bill access limited to their own bills and preserve audit history.
3. Refine interrupted checkout and imports: retain drafts, explain uncertain saves,
   show actionable row errors, and distinguish recorded payments from money collected.
4. Continue localization coverage for new backend validation messages; use explicit
   templates instead of constructing translated sentences from fragments.
5. Make price/discount rounding consistent in catalogue, bill preview, saved receipt
   and return amount. Keep financial calculations on the server.

## Next features, in order

1. **Hold/resume bills:** park a customer's cart, serve another customer, resume it.
   Drafts do not reserve or subtract stock; checkout revalidates available stock.
2. **Suppliers and restocking:** supplier contact, reorder list and simple incoming
   deliveries recorded through the stock ledger. Avoid full purchase accounting.
3. **Daily cashier summary:** bills, returns and totals by payment method/employee,
   with owner access to all summaries and staff access to their own activity.
4. **Customer history:** optional customer records, past purchases and receipt
   sharing initiated by the user, with consent and retention controls.
5. **Invoice configuration:** business details, invoice numbering and agreed tax
   requirements. Existing simple receipts must not be presented as tax invoices.
6. **Multiple stock locations:** location-aware movements and audited transfers,
   added only after the single-store flows are stable. A transfer must debit one
   location and credit another atomically, without changing total business stock.

## Scaling the implementation

- Retain the Rails/Next.js API separation. Split repositories only when independent
  teams or release cycles justify it; repository size alone is not a reason.
- Measure slow endpoints and query counts before adding caches or infrastructure.
  Index business-scoped search/filter paths, paginate large lists and reports.
- Process larger imports/exports and mail delivery as retryable background jobs.
  Use idempotency keys for mutations and track job status for users.
- Review lock ordering and add concurrency tests as checkout, imports and locations
  grow. Ledger integrity and tenant isolation take priority over faster dashboards.
- Apply subscription limits in domain services, not only UI controls. Separate
  account permissions, business roles and location access if locations are added.
- Defer Elasticsearch, microservices and full offline stock synchronization until
  measured needs justify their complexity.
