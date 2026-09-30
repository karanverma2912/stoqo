# Plans, trials and manual activation

Open Plans & usage from the desktop rail or Settings on mobile. Plans, prices, seat limits, optional product limits, availability and trial duration come from `SubscriptionPlan`. Seeded Starter/Business/Pro prices remain the proposed INR 49/149/299 monthly amounts and 3/10/25 seats. Product limits default to `nil` (unlimited); set a positive value if the business later chooses a cap. The owner and unexpired invitations consume seats. Every saved product, including variants and archived items, consumes one product slot.

Business creation snapshots `trial_ends_at`; changing trial duration never extends existing trials. Paid access uses `subscription_ends_at`. A legacy active business without an end date keeps its manually granted access, and the UI identifies the missing date. Expired access is read-only: inventory, bills and authorized reports/exports remain readable. New sales, stock changes, products and invitations are blocked. Renewal requests and cancellation of pending requests remain available after expiry.

Owner/admin can request a plan or renewal. Staff/managers can inspect plans and usage but cannot request or cancel. At most one pending request exists per business; repeated requests for the same plan return the same record. Requests snapshot quoted name/price/currency and never activate access or collect payment. Cancellation affects only the pending request, never the active subscription. Capacity is checked at both request and approval time; no data or employee accounts are deleted to fit a lower limit. Product limits are enforced inside the locked creation service, including imports and bulk variants. Import row errors preserve successful rows.

## Operator workflow

This release uses **manual review**, not automatic payments. No Razorpay account, checkout, payment links, recurring mandate or webhook is connected. No emails are sent when a request is created. Operators must regularly review the queue using:

```
cd backend
bundle exec rails billing:requests
```

After independently verifying the payment with the provider, use a real persisted Stoqo user representing the billing operator and approve from a trusted backend environment:

```
bundle exec rails 'billing:approve[REQUEST_ID,VERIFIED_PAYMENT_REFERENCE,2026-12-01T00:00:00Z,operator@example.com]'
```

Replace every example value with verified details. The end date is an explicit paid-through timestamp, not inferred from the browser. The service checks current plan availability, unchanged pricing, current capacity, a unique payment reference and a future end date. It refuses to shorten existing paid access. Retries with identical details return the existing approval. Approval changes the plan and end date atomically, attributes the activity to the operator, and creates an in-app activation notification. A plan whose price changed requires a fresh customer request. There is no public approval route.

Before automated billing goes live, integrate provider checkout plus signature-verified webhooks, reconcile charged amounts/currency/payment status server-side, and cover renewal failures, cancellations, refunds and provider retries. Route verified events through a dedicated adapter; never activate from a client success callback. Subscription tax invoices and automatic payment collection are not part of manual review.

Migration: `rails db:migrate`. New-business default plan must be available. No new secret variables are required for manual review. The ChatGPT demo simulates plan requests in browser storage and cannot activate production access.
