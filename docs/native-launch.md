# Native app, collaboration and AI

Stoqo now has an Expo React Native Android/iOS client in `mobile/`, backed by the existing Rails API. The Next.js website remains in `frontend/`. The previous WebView code is archived under `legacy/android-webview`.

## Implemented

Native sign-in/signup, account recovery and removal, store switching, inventory, product photos, camera barcode scanning, variant labels, suppliers/restocking, saved/held carts, billing PDFs, return history, customer history, reports, imports, team invitations and per-user notification receipts. Purchase prices and financial reports follow server roles.

Checkout, product creation, stock changes, returns and variant creation use persisted request keys. An interrupted response freezes the original request for retry. Each request activation owns its pending state: a delayed load or response from another product/store cannot replace or clear the current request. Successful retired requests clear only their original saved key; uncertain responses retain it for retry. These are online writes; offline stock synchronization is not implemented.

Invitation links expire in seven days and match the invited email. After sign-in and acceptance, the user joins immediately without another administrator approval. When email delivery is configured, encrypted token jobs deliver the invitation email. Until then, the owner can share the generated link. Signup verification/password reset email also need an email provider. `REQUIRE_EMAIL_VERIFICATION=true` should be enabled after mail delivery is verified. The HTTPS Resend adapter supports free Render deployments where standard SMTP ports are blocked.

Foreground realtime uses short-lived one-use WebSocket tickets and database-backed Action Cable. Each device receives store invalidations. Overlapping resume events open only one connection, and tickets/callbacks from retired connections are ignored. Both the user and current workspace must confirm subscription before the client considers the connection ready. A stalled handshake reconnects with backoff; backgrounding cancels reconnect attempts. Rejected subscriptions and membership changes clear cached data and refresh access. Read/unread state is personal and synchronizes across that user's devices. Background push uses device/session-scoped Expo registrations with delivery/receipt tracking; Firebase/Expo credentials (and Apple push credentials for iOS) are still required. Logging out disables that session's push registration.

Notification handling runs at the app root, including when opening directly into a non-tab screen. A tapped alert waits for login and invitation redirects, switches to an accessible store and opens its notifications. Malformed destinations and inaccessible stores are ignored. Granted push permissions are synchronized on login, app resume and token rotation without repeating the phone permission prompt. An explicit disable in Settings stays disabled until the user enables it again. Interrupted startup connections offer a retry using the saved login; late responses from an earlier login cannot expire the current session or replace its memberships.

The assistant uses server-side Gemini tools for live inventory, employee information, recent alerts and daily summaries. Roles restrict tools and returned data. Stock changes, bills and invitations are saved proposals, require the user's explicit confirmation, expire in ten minutes and recheck permission at execution. Conversations are scoped to the user/store and cleared on role change. Voice input uses the phone's speech recognition; text-to-speech reads answers. Gemini API key, quotas and per-store AI opt-in are required. A Gemini consumer subscription does not supply a server API key here. No key belongs in the native app. No paid provider fallback is configured.

## Build

Node 24; `npm --prefix mobile ci`, `npm --prefix mobile run typecheck`, `npm --prefix mobile test`, `npm --prefix mobile run lint`. Start the native client with `npm run dev:mobile`.

Configure the live HTTPS API/web URLs in `mobile/production.json` or use `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_URL` for a separate environment. Both EAS and the manual GitHub build use the same validation; origins are included in the public Expo manifest so a build does not depend on GitHub environment files. Missing, local, placeholder and insecure release origins stop the APK build.

For an APK without GitHub builds, run:

```bash
npm --prefix mobile run check:release
npm run build:apk
```

The `apk` EAS profile produces an internal-distribution APK; `npm --prefix mobile run build:android` builds a Play Store AAB. An Expo account/project and signing setup are required. Preserve one permanent signing key across builds and import the existing key into EAS before switching signing pipelines. A CLI profile does not provision servers or provider credentials. Keep builds within the provider's free quota; no build or paid purchase was started by these source changes.

All GitHub workflows are manual-only: pushing source triggers no GitHub build. To use GitHub later, manually run **Quality gates** on the same commit first, then **Android release** on `main`. That release workflow generates the native project, obtains the permanent signing key using verified GitHub OIDC, builds an APK and Play Store AAB, verifies the certificate, waits for quality gates and publishes a GitHub release. Only the pinned repository's main-branch release workflow can obtain signing credentials. Never rotate `SECRET_KEY_BASE` without reencrypting signing credentials, or delete the signing database row. Preserve a private database/signing backup.

Expo EAS profiles also support native builds. iOS signing/TestFlight require an Apple developer account and credentials. Background push requires an Expo project, Firebase Android config and FCM v1 credentials. The GitHub APK can run core workflows without those credentials.

## Before public store release

Test on real Android devices and iPhones: signup, invited-email join, barcode/camera permissions, stock/sale/return retry after network interruption, billing/labels, voice permissions, account deletion, multiple stores and role removal. Verify actual invitation mail, Gemini tool calls and background pushes on two devices after configuring providers. Complete privacy/data-safety declarations, store listing/screenshots, publisher verification and any required closed test. A signed build is not evidence of store approval or physical-device QA.
