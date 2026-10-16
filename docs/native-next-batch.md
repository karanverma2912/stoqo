# Native follow-up — 16 October 2026

The owner requested source changes only while collecting more app feedback.
**No APK, AAB, EAS update, or GitHub Android build was started.** The installed
release remains 0.3.1/code 4. Bump the release version/code when the owner asks
for the next build, and reuse the existing canonical EAS signing key.

## Live demo inventory

Verified ownership and active subscription for Maheshwari kirana (business 4)
before inserting 16 demo products. Names begin with `Demo ·` and SKUs use
`DEMO-MK-001` through `DEMO-MK-016`. Prices and quantities are examples; no retail
barcodes were invented. Existing products were not changed.

The one atomic, store-scoped insert created 14 nonzero opening-stock movements
and 30 corresponding activity records. Readback found 289 total units, three
low-stock products, two out-of-stock products, and zero differences between
product stock and its movement ledger. Refresh Inventory in the installed app
to see the products. No sample sales were created.

## App changes waiting for the next APK

- Selected bottom tabs use the icon color/stroke and label weight without a
  background highlight. The central Sell action keeps its action-button shape.
- Add/edit product has an inline barcode scan sheet with camera, photo and
  manual entry fallback. Scanning and closing the sheet preserve the draft's
  other fields. Camera permission is refreshed after returning from settings.
- Inventory rows offer Add stock and Remove stock. The sheet reuses existing
  product details, previews quantity after the change, supports damaged stock,
  and requires confirmation. The product detail uses the same stock form.
- Positive quantities allow up to three decimal places. Over-removal is blocked
  locally and remains enforced by the API. Uncertain writes retain their exact
  body and idempotency key across closing/reopening the sheet. In-flight writes
  are exclusive per operation even if another screen mounts the same product.
- Assistant has Store snapshot, Low stock, Out of stock, New bill, Scan product
  and Update stock, in addition to How Stoqo works. Summary/list shortcuts read
  the current store API without sending data to an AI provider. Hindi labels
  and replies are included. Gemini chat still needs its provider configuration
  and per-store opt-in. Role and task-confirmation behavior is preserved.
- Missing native Firebase setup no longer attempts token registration or shows
  its raw SDK diagnostic to the user. Settings explains availability and links
  to in-app store notifications. Existing login, token-rotation, stale-account
  and explicit-disable behavior is preserved.

## API wake-up and scheduled checks

`/ready` already exists and checks the API/database. Native startup and resume
now share one anonymous readiness request when its last success is older than
ten minutes. A slow-connection notice appears after 3.5 seconds; readiness has
a 90-second limit before showing a retry message. Store requests wait for this
check, and an account change during the wait prevents the earlier request from
being sent. Health checking never replays a mutation.

The connected Cloudflare account now has the `stoqo-api-keepalive` Worker. Its
three Cron Triggers were accepted and read back on 16 October at 06:24 UTC:

| UTC cron | Asia/Kolkata coverage |
| --- | --- |
| `30,40,50 1 * * *` | 07:00, 07:10, 07:20 |
| `*/10 2-16 * * *` | 07:30–22:20 every ten minutes |
| `0,10,20 17 * * *` | 22:30, 22:40, 22:50 |

The Worker calls only the API's public readiness endpoint. HTTP and preview
routes are disabled, and no credentials are embedded. Its required account
subdomain is `stoqo-karan2912.workers.dev`; this does not expose an HTTP health
trigger. No paid plan or Render service was changed. The exact source and
schedule are in `ops/keepalive/`. The Worker function also passed a live check
against `/ready` with HTTP 200, taking about eight seconds.

Render Free sleeps after 15 idle minutes and shares 750 instance hours per
workspace/month. The chosen daytime window leaves headroom for the separate
website. The website is not kept awake by this Worker. Overnight cold starts,
quota exhaustion, deployments and provider outages remain possible. Cron
changes can take up to 15 minutes to propagate; accepted schedules alone do not
prove that a scheduled event has run.

## Firebase work remaining before the next release

The installed APK lacks the native Firebase client configuration; a JavaScript
change cannot initialize a Firebase app that was not packaged into it. Before
claiming background Android push works:

1. Register Android package `com.stoqo.app` in the owner's Firebase project and
   obtain its `google-services.json` client configuration.
2. Store that file as the EAS `GOOGLE_SERVICES_JSON` file environment variable
   for the build environment. `app.config.ts` already sets `googleServicesFile`
   and the public `androidPushConfigured` flag from the same variable.
3. Configure the matching FCM V1 service-account credentials in EAS. Keep the
   service-account private key out of source and the mobile application.
4. When the owner requests the next APK, include the configuration, retain the
   existing signing certificate, and test registration and delivery on a real
   phone while the app is backgrounded/closed. Include disabled and rotated
   token scenarios. No Firebase credentials were supplied in this batch.

Reference: https://docs.expo.dev/push-notifications/fcm-credentials/

## Verification

74 native unit/regression tests, TypeScript checks, Expo lint and release
configuration validation pass. Two Worker tests and checking its JavaScript
against current Cloudflare Workers types pass. Live demo ledger verification
and the API readiness check pass.

An internal fixture harness using the actual React Native screen components
through React Native Web passed barcode draft preservation/save, camera-sheet
dismissal, stock add/remove, over-removal rejection, uncertain-response retry
after close/reopen with the same key, six assistant shortcuts without an AI
request, notification availability, and icon-only selected-tab backgrounds.
Sixteen layouts passed at 360/430 px in light/dark themes with no page errors or
horizontal control overflow; Hindi shortcut labels and live-read replies also
passed. Camera events, storage and API responses were fixtures. These checks
do not validate physical barcode recognition, Android keyboard/permission
behavior, native animation timing or real Firebase delivery. Those checks wait
for the next owner-requested APK.

Suggested next work: cached inventory for slow connections, expiry/batch fields
for kirana products, and an auditable reverse-stock action for mistakes.
