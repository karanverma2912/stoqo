# Stoqo architecture

## Boundaries

`frontend/` is an independently buildable Next.js app. `backend/` is an independently deployable Rails API. No frontend package imports Rails source. A future split needs two Git repositories and CI paths updated; the HTTP contract does not change.

Browser → same-origin Next.js proxy → Rails `/api/v1` → PostgreSQL. The proxy stores opaque bearer sessions in an HttpOnly, SameSite=Lax cookie, validates the request origin for writes, and never returns the bearer token to JavaScript. Rails stores only SHA-256 token digests with an expiry and supports revocation on logout. Mobile clients can use the same Rails authentication endpoints directly.

`X-Business-Id` selects a workspace, but never grants access. Every request resolves an authenticated membership before looking up business data. Product/category composite foreign keys additionally enforce same-business association at database level. Owners, admins and managers can write. Staff can read. Reporting and workspace administration have separate policy checks. Configurable permissions and invitations are deferred.

## Inventory invariants

StockMovement is the ledger. Product.current_stock is a cache, never an accepted product parameter. Inventory::AdjustStock locks the product row, checks the actor, validates signed decimal quantity, detects idempotent retries, rejects negative inventory, inserts the movement, updates the cache, and records activity and warning-state notifications in one transaction. Precision is 3 decimal places for quantities and 2 for prices. Incoming types are positive; outgoing types negative; adjustment/other can be either. Failed transactions leave no partial ledger or audit writes. Persisted movement models are read-only; corrections use a compensating movement.

A request key must be reused for retries of the same change. Keys are unique within a business. Reusing one for a different product, direction or quantity is rejected. Reconciliation can compare products.current_stock with stock_movements.sum(quantity); do not repair by deleting history. Database credentials must be restricted to trusted application processes.

## Imports

CSV/XLSX uploads are capped at 5 MB and 5,000 rows. Sidekiq processes an import under a row lock in one outer transaction; each product uses a savepoint so invalid rows can roll back individually. Finished jobs are idempotent. Invalid rows record human-readable errors. A worker crash rolls the transaction back; retry can restart safely. Large future imports should use indexed staging rows and bounded batches rather than keeping a long transaction open.

Images use Active Storage; application validation accepts JPEG, PNG and WebP up to 5 MB. Image reads pass through the same authenticated membership scope; unrestricted Active Storage routes are disabled. Production uses S3-compatible storage; local development uses disk.

## Trials and subscriptions

SubscriptionPlan stores prices in minor units, currency, default-plan selection and trial_days. Business creation snapshots the trial end. Existing trials do not change if the default configuration changes. Seeds create Starter ₹49, Business ₹149 and Pro ₹299 with a 90-day launch trial, only when absent. To change future trial duration, update the default plan in the database. Expired trials are read-only; viewing and export remain available. Plan requests, capacity enforcement and audited manual activation are implemented; see subscriptions.md. Automated payment checkout, webhooks and recurring billing are not connected.

## Future extension points

- Variants: introduce StockItem or ProductVariant; migrate each existing product to a default variant; move ledger references and cached balance to that stock item. Keep Product as the shared catalog parent.
- Invitations: add expiring, hashed invitation tokens and redeem into unique business memberships. Do not create users tied to one business.
- Notifications: the Notification model is business-level and read state is shared. Add NotificationDelivery/user receipts before personal email/push preferences. Add scheduled trial reminders and deduplicated low-stock delivery jobs.
- Billing: add provider customer/subscription identifiers and verified webhook processing with idempotent event records. Keep authorization based on server-side subscription state.
- Offline: the service worker only supplies a fallback shell. It deliberately never caches authenticated APIs or queues inventory writes. Offline reconciliation requires explicit conflict and idempotency design.

## Production work still required

Configure hosting, database, Redis, object storage and monitoring; verify backup restoration; run CI and staging end-to-end tests; configure trusted proxy IP handling and rate limits; add email verification and password reset before a public launch. Camera scanning needs a real HTTPS mobile-device check. No claim of full production certification is made by scaffold/build success.
