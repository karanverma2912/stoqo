# Stoqo architecture

## Boundaries

`frontend/` is an independently buildable Next.js app. `backend/` is an independently deployable Rails API. No frontend package imports Rails source. A future split needs two Git repositories and CI paths updated; the HTTP contract does not change.

Browser → same-origin Next.js proxy → Rails `/api/v1` → PostgreSQL. The proxy stores opaque bearer sessions in an HttpOnly, SameSite=Lax cookie, validates the request origin for writes, and never returns the bearer token to JavaScript. Rails stores only SHA-256 token digests with an expiry and supports revocation on logout. The Expo React Native app uses those authentication endpoints directly and keeps session tokens in the OS secure store. It clears the query cache when memberships/roles refresh.

`X-Business-Id` selects a workspace, but never grants access. Every request resolves an authenticated membership before looking up business data. Product/category composite foreign keys additionally enforce same-business association at database level. Owners/admins manage teams and see costs; managers edit products and view permitted reports; staff handle operational stock and sales. Reporting, cost fields and workspace administration have separate policy checks. Invitations use expiring hashed tokens and require the invited email; acceptance grants membership immediately.

## Inventory invariants

StockMovement is the ledger. Product.current_stock is a cache, never an accepted product parameter. Inventory::AdjustStock locks the product row, checks the actor, validates signed decimal quantity, detects idempotent retries, rejects negative inventory, inserts the movement, updates the cache, and records activity and warning-state notifications in one transaction. Precision is 3 decimal places for quantities and 2 for prices. Incoming types are positive; outgoing types negative; adjustment/other can be either. Failed transactions leave no partial ledger or audit writes. Persisted movement models are read-only; corrections use a compensating movement.

A request key must be reused for retries of the same change. Keys are unique within a business. Reusing one for a different product, direction or quantity is rejected. Reconciliation can compare products.current_stock with stock_movements.sum(quantity); do not repair by deleting history. Database credentials must be restricted to trusted application processes.

## Imports

CSV/XLSX uploads are capped at 5 MB and 5,000 rows. Active Job processes an import under a row lock in one outer transaction; each product uses a savepoint so invalid rows can roll back individually. Finished jobs are idempotent. Invalid rows record human-readable errors. A worker crash rolls the transaction back; retry can restart safely. Large future imports should use indexed staging rows and bounded batches rather than keeping a long transaction open.

Images use Active Storage; application validation accepts JPEG, PNG and WebP up to 5 MB. Image reads pass through the same authenticated membership scope; unrestricted Active Storage routes are disabled. The free deployment stores limited uploads in PostgreSQL through a custom Active Storage service; S3-compatible storage remains optional. Local development uses disk.

## Trials and subscriptions

SubscriptionPlan stores prices in minor units, currency, default-plan selection and trial_days. Business creation snapshots the trial end. Existing trials do not change if the default configuration changes. Seeds create Starter ₹49, Business ₹149 and Pro ₹299 with a 90-day launch trial, only when absent. To change future trial duration, update the default plan in the database. Expired trials are read-only; viewing and export remain available. Plan requests, capacity enforcement and audited manual activation are implemented; see subscriptions.md. Automated payment checkout, webhooks and recurring billing are not connected.

## Collaboration and AI

Product groups hold shared variant names; each sellable product retains its own size, colour, barcode and stock ledger. Notification receipts belong to individual users. Action Cable uses short-lived one-use tickets; channels recheck sessions and current memberships. Database-backed jobs broadcast invalidations and submit generic lock-screen Expo pushes to active device registrations, then check provider receipts.

Gemini requests are server-only. Tools are scoped to the current store/member and exclude credentials/customer contacts. Changes are proposed as user-owned expiring action records and require explicit confirmation; confirmation rechecks current permissions and uses the normal inventory/checkout/invitation services. Conversation context is discarded after role changes. Voice input/read-aloud use phone speech services. Per-store AI calls and global HTTPS email deliveries are capped; a provider quota error does not select a paid fallback.

Solid Queue and Solid Cable share the primary PostgreSQL database. The free pilot runs the worker supervisor alongside Puma in async mode and caps database file storage. More demanding deployments can use a dedicated worker and object storage. `STOQO_FREE_PILOT=true` selects an active, zero-price ten-seat pilot plan for new stores rather than beginning paid billing.

## Remaining operations

Deploy the API/website after credential authorization, configure zero-spend limits and provider keys, verify live email/Gemini/background push, exercise a private backup restore and test on physical Android/iOS devices. Paid billing, full offline reconciliation and Bluetooth printer support are separate extensions. See [production status](production-status.md) and [native launch requirements](native-launch.md).
