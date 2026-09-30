# Live launch, employees, barcode workflow and Android

## Deployment

The ChatGPT Site is a separate browser-local demo. It is not the Rails application and is not a backend for employees.

`render.yaml` provisions Next.js, Rails API, Sidekiq, Postgres and Key Value in Singapore. It deliberately uses durable paid services rather than an expiring trial database. Review Render's actual quote before applying. Import the GitHub repo as a Blueprint. Supply S3-compatible bucket/access keys/endpoint (R2 works); API and worker share this object store for uploaded product images and imports. No secrets belong in Git. Rails migrations and seeds run before API deployment. `API_HOST` connects Next.js to the internal Rails hostname. Keep `API_URL` for a custom external API instead. On Render, the external and internal API hostnames are included in Rails host authorization. The browser and Android app always use the Next.js frontend URL.

Launch checks: signup, business creation, product with image and opening stock, CSV import completion, stock sale, second-device reload, employee invitation acceptance, employee removal, camera permission deny/retry, successful physical-barcode scan. Test uploads after a redeploy. A successful build alone is not a live deployment.

## Team

Settings → Your team → enter employee email and role → Create invitation → share link yourself. No automatic email delivery is configured. Invitee opens link, signs up/signs in with the invited email, and accepts. Invitations are single-use, expire in 7 days, store a token digest only, and can be revoked. The token is in a URL fragment and is removed from the address bar on opening.

Seat limits include the owner, active memberships and unexpired pending invitations. Creation/acceptance/removal lock the business row. Provisional defaults: Starter 3, Business 10, Pro 25. Existing plans retain their saved limits; the migration gives them 3 until an operator changes `member_limit`. New seeded plans use 3/10/25. Configure actual commercial limits before launch; no self-service payment/upgrade is implemented.

Owner/admin: team management; manager: product editing/import/reports; staff: view inventory, register new products, add stock and record sales/damage/returns. Owner cannot be removed. Removing membership immediately blocks future API access to that business, while retaining historical actor attribution. This initial role model is not a customizable permissions engine. Purchase prices are currently visible to members; restricting these requires a separate field-level permission policy.

## Barcode and sizes

Camera, barcode photo, keyboard/USB scanner and manual entry use the same exact business-scoped lookup. Known barcode → saved details and stock → Stock in or Sold / stock out → quantity/reason → confirm. Unknown barcode → product form with barcode filled → add name, optional size/colour/prices and opening stock. Stock does not change merely by scanning.

A normal retail barcode is an identifier, not an embedded product catalogue. Product details come from saved inventory. External catalogue autofill is not connected and cannot guarantee data for arbitrary products; purchase price, store selling price and available stock must be supplied by the business.

`products.size` and `products.color` are optional structured columns. Each sellable size/colour is its own stock item with independent SKU, barcode and ledger. Example: Tee / Black / M and Tee / Black / L. Display names combine the base name and options without modifying the base name. Do not reuse a barcode between variants within the same store. Inventory → Sizes & labels now groups these items into product families, supports bulk variant creation and prints internal barcode labels. See product-setup.md.

## Android

`mobile/android` is an online WebView-based Android app, not a separate React Native UI. It uses the live Next.js interface and Rails API, the same authentication and the same inventory. On first launch, enter the live HTTPS frontend address and verify the confirmation. It never ships demo inventory or embedded secrets. Camera is granted only for the configured origin; microphone is not granted. File selection supports product images, imports and photo scanning. CSV exports currently open the browser workflow. Use the Browser button to accept invitation links if preferred, then sign in to the app with the same account.

The Android APK workflow builds an installable debug-signed test APK and runs Android lint. Download its artifact from GitHub Actions. A production release needs a permanent private signing key, update/version management and device testing; do not distribute debug builds as a Play Store production release. Each fresh CI debug key can require uninstalling a previous test build. No offline stock synchronization or push notifications are implemented.
