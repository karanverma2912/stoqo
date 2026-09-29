# Checkout and bill access

Checkout lives at `/app/checkout`. Scan multiple items with the camera (move the code away between repeats), a USB scanner, or search/tap products. Unknown barcodes open Add product with the barcode filled. Different sizes/colours remain distinct inventory records and barcode matches.

| Action | Owner / Admin / Manager | Staff |
|---|---|---|
| Create a sale and change cart quantities | Yes | Yes |
| Edit selling prices or apply a bill discount | Yes | No |
| View, print or share bills | All store bills | Own bills only |
| Record returns and restock | Yes | No |
| Manage employees and subscriptions | Owner / Admin | No |

Checkout creates a snapshot of business name, cashier, item names, prices and quantities. Stock deductions and the bill save in the same database transaction. Business and ordered product locks prevent overselling; stable request keys protect retries. A network-uncertain request remains in session storage for retry after reload. Completed bills cannot be edited or deleted through the API. Corrections use traceable returns, with quantities capped at the remaining quantity and discounts included in the proportional refund amount.

Owner/admin/manager bill history includes every employee's bills. An in-app notification records completed sales. Sharing is a user-triggered native share or clipboard action; automatic email/WhatsApp delivery is not configured. Staff bill access is enforced by the API, including sale notifications and bill activity records.

This release creates simple sales receipts, not GST tax invoices. Cash/UPI/card selection records payment already received; it does not collect payment. Returns record a refund amount and restore resellable stock; refund payment happens separately. Browser printing supports Save as PDF. Native thermal printer integration, GST configuration and automated messaging are follow-up features.

English and Hindi translations cover checkout and receipts. Scanner guidance, product creation and the wider app remain English. Locale is remembered on the device. This can be extended to a shared application-wide translation catalogue.

Database migration: `rails db:migrate`. No new secrets or external services are required. The ChatGPT demo, when published, uses browser-local sample data; production staff isolation requires the Rails API.
