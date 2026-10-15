# Production handoff — 15 October 2026

## Ready in source

- Expo React Native application for Android/iOS with native inventory, scanning, checkout, bill PDFs, returns, team and account workflows.
- Gemini assistant: store/user/role-scoped tools, voice input/read-aloud, explicit confirmations and usage limits. Provider transport is tested with stubs; no live Gemini key is available in this workspace.
- Invitation delivery through HTTPS Resend or SMTP, one-use invited-email acceptance without another administrator approval, recovery and verification email.
- One-use WebSocket tickets, private notification receipts, device/session-scoped Expo background push and receipt handling.
- Retry-safe, persisted mobile write requests and PostgreSQL-backed durable jobs/uploads.
- Foreground notification connections ignore retired tickets and socket callbacks, deduplicate resume events, recover stalled handshakes, and recheck rejected subscriptions. Pending writes own their navigation scope so an earlier operation cannot replace or clear another operation's saved request.
- Free Render API/website configuration, permanent encrypted Android signing service and protected GitHub OIDC release workflow.
- Startup retry with saved-session isolation; store selection and push registration preserve operation order during login changes.
- Root-level notification launches with store switching, automatic push re-registration for granted permissions, explicit disable persistence and token rotation handling.
- EAS APK/AAB profiles use the same release-origin validation as manual GitHub builds. Source pushes trigger no GitHub workflows.

## Verification

The earlier 14 October follow-up passed website typecheck and all 18 website tests. The 15 October deployment follow-up passed website typecheck, all 23 website tests and a production build. Five new cases cover trusted public HTTPS origins behind the hosting proxy, rejected foreign/missing origins, custom domains, local development and invalid configuration.

The quality-gate run at commit `ba6b0802fe33c68caaf951f56471b3e6cb6e4169` passed Rails database migrations and 104 RSpec examples, frontend typecheck/tests/production build, browser workflows, native typecheck/tests/lint and Android JavaScript export. Native Android compilation is a separate gate; a test APK is not a production-signed launch artifact. Physical-device and live-provider testing remain required.

The combined 14 October continuation passed 43 native tests, TypeScript checks, Expo lint, the Android JavaScript export and manual-workflow trigger validation. Regression cases cover realtime reconnects, retired callbacks, persisted-write isolation, stale authentication failures, delayed secure storage, push registration across login/token changes, opt-out, interrupted registration, invalid notification destinations and the actual Expo manifest. Rails and Next.js source were not changed in this continuation. No cloud APK build was started and no production APK/AAB was produced.

## Deployment state

Live checks on 15 October confirm that the Stoqo Supabase project is connected to the Rails API. All migrations ran successfully, and its private `stoqo` schema now contains **52 tables**, owned by the dedicated `stoqo_app` role. The supplied session pooler is `aws-0-ap-south-1.pooler.supabase.com:5432`; the API uses the dedicated application's pooled username and TLS.

Both free Render services are live: **https://stoqo-web.onrender.com** and **https://stoqo-api.onrender.com**. The website's server-only `API_URL` points to the API. API `/ready` and website `/api/health` returned HTTP 200 with `{"status":"ready"}` after connection. A later external read timed out during live verification, so successful health responses alone must not be treated as complete phone or workflow testing.

The completed live website-to-API smoke test passed signup, an HttpOnly session cookie, current-user lookup, store creation, product creation, repeated product/stock requests applying once, stock readback, a durable CSV import completing in the worker and notification retrieval. The temporary test stores were deleted and the test accounts disabled through account removal. The first smoke run hit an external read timeout and cleaned up successfully; the subsequent run completed. This does not replace barcode/camera, checkout/billing or physical-device checks.

The later direct API smoke test followed the native app's bearer-token contracts: signup, current user, store creation/selection, product creation and retry protection, cash checkout and persisted receipt data, stock readback, dashboard, notifications, realtime ticket issuance, login/logout and session isolation all passed. Repeating checkout returned the same sale and left stock at two from an initial three. Its temporary store was removed and its test account disabled. This verifies the live API flow; camera scanning, PDF rendering/sharing, actual WebSocket delivery and phone interactions still need device checks.

The user's explicit 15 October "Sure" approved the saved database password and Rails secret being stored in the connected Render Backend workspace. Service creation succeeded with that approval. Credentials are configured on the API, preserved privately and excluded from source and native configuration. Do not request this permission again or reset the database password.

The first deployment exposed a Solid Queue/Puma integration failure: the supervisor environment variable did not select the plugin's async mode. The committed correction explicitly sets `solid_queue_mode` and uses a single Puma process for the embedded queue. Live logs and fresh database heartbeats confirm a supervisor, dispatcher, worker and scheduler are running. The website's public-origin check also needed to use Render's trusted external URL after TLS termination; live checks now reject missing/foreign origins while legitimate HTTPS requests reach the API.

**An installable Android release APK is built and verified.** Expo device login is complete, and `@karanverma2912/stoqo` is linked through the public project UUID in `mobile/production.json`. EAS holds the canonical Android keystore, whose public SHA-256 certificate is pinned in that file. SDK 57 packages are aligned with Expo's recommended versions, including AsyncStorage 2.2.0. Release validation, native typecheck, lint, 44 native tests and all 21 Expo Doctor checks pass; the website also passes typecheck, 26 tests and its production build. Earlier skipped GitHub workflow runs are not APK evidence.

The [EAS Android build](https://expo.dev/accounts/karanverma2912/projects/stoqo/builds/70ead16b-2bcd-4f8e-a8ac-9b45f5e6eaf2) is `70ead16b-2bcd-4f8e-a8ac-9b45f5e6eaf2`, completed successfully at **2026-10-15 17:03:23 UTC** from source commit `57329ffe9f7f270b62c1300d923218f7c255c7cd`, profile `apk`, version 0.3.0 and version code 3. Downloaded file `Stoqo-0.3.0-Android.apk` is **130,818,093 bytes**; its SHA-256 is `8e8e5a903726905ea38c0baa79b080763ae6a7a5e0ee2de9388cfca8fdcd62a1`. No second cloud or local APK build was submitted.

Android `apksigner` verifies the downloaded file and its certificate matches the canonical EAS pin. `aapt2` confirms package `com.stoqo.app`, version 0.3.0/code 3, minimum API 24, target API 36 and a release build without debuggable mode. The native React Native library and JavaScript bundle are present, with the live API and website origins embedded. The shared release verifier accepts this APK and rejects an intentionally mismatched expected certificate. Supported architectures are arm64-v8a, armeabi-v7a, x86 and x86_64. These checks do not replace launching the app on real phones.

The website certificate environment is configured and its live association endpoint returns the canonical certificate. API and website readiness checks returned HTTP 200; a later cold-start check briefly returned 503 at the website, then passed on retry. Free hosting can sleep between uses.

Next: install and test the verified APK on real phones. The website association route reads the explicit certificate instead of asking the backend to generate signing metadata. The protected backend signing setting is retained; the alternate GitHub signing and verification scripts reject a certificate that differs from the EAS pin. GitHub workflows remain manual-only. Gemini and email remain disabled until their provider setup is available. No paid resources or purchases were selected.

## 16 October follow-up: signup feedback and password visibility

The user confirmed that signup succeeds with a password of at least 12 characters. The native auth screen had discarded the API's field-specific validation details and displayed only the generic "Please check the highlighted details" message.

Version 0.3.1 source (Android version code 4) validates signup passwords before sending the request, shows each validation error beneath its corresponding input, and keeps the minimum-length hint beside the password. Existing-email errors advise signing in. The shared password field includes an accessible eye button to show/hide the value, covering sign-in, signup, reset and change-password fields. English and Hindi labels are included; switching auth modes hides the password again.

All 51 native tests, native TypeScript checks, Expo lint, release configuration validation and the Android JavaScript export pass. API and database source were unchanged. No 0.3.1 APK has been built at this checkpoint: `eas whoami` returned "Not logged in" in the refreshed build environment. Renew Expo device login and reuse the existing canonical EAS keystore for the signed update. The completed 0.3.0 build above remains the last verified APK.

## 16 October follow-up: native UI refresh

The 0.3.1/code 4 source now uses a shared forest/cream/lime palette, Manrope typography, consistent SVG icons and rounded controls across the native app. Sign-in/signup have an animated mode switch, clearer form hierarchy and the field-specific password feedback above. The dashboard, inventory list, checkout, workspace menu, assistant and store setup have new layouts. Shared controls also refresh the remaining utility screens. Theme and Hindi preferences remain available; press, entry, layout and navigation transitions respect the reduced-motion setting.

All 51 regression tests, native TypeScript checks, Expo lint, release configuration validation and the Android JavaScript export pass. A temporary internal browser harness rendered the actual React Native screen components through React Native Web with fixture services. Six interactive flows passed: auth/password/reset, inventory filters and debounced search, decimal checkout totals and held-cart resume, staff menu permissions, business-type selection, and disconnected-assistant help. Thirty-two layout checks passed at 360/430 px in light/dark themes, with no page errors or horizontally overflowing controls. Visual review also corrected a decorative overlap in the smaller auth hero. The harness uses an animation shim; it does not validate native animation timing, device keyboards, camera, microphone or physical-phone behavior.

The app remains a React Native client, with no WebView or web-install wrapper. Font licenses are included in the public Expo manifest. Production services and signing configuration are unchanged. The update is ready for the cloud APK build, but no 0.3.1 APK exists yet: the current CLI session is logged out of Expo. Restore the owner's device login and reuse the existing EAS keystore with frozen credentials; never generate a replacement key. GitHub builds remain manual-only.

## Inputs and launch gates remaining

1. Physical-device checks of the completed, signature-verified native APK, including scanning, receipt PDF sharing and foreground realtime delivery. Expo authentication, project linking, permanent EAS signing and the live servers are configured.
2. A server-only Gemini API key from a free API project; Gemini Pro consumer account access does not configure the API here. Enable AI per store only after reviewing Google's API data-use terms.
3. HTTPS email-provider key and verified sender; a support mailbox. Automatic invitation/recovery email cannot be verified until configured.
4. Firebase configuration and FCM credentials for background Android push; Apple signing/APNs credentials for iOS. The Expo project ID is configured. Foreground realtime does not require those push credentials.
5. Android/iPhone and two-device tests, an iOS signed build, a backup/restore exercise, publisher accounts, store listings/privacy declarations and required testing/review.

Set provider spend/overage limits to zero before deployment; free Render plans may bill overages if a payment method is present. The pilot can use free service plans within provider quotas; sleeping services and limits prevent an unlimited, always-on guarantee. Google Play normally has a US$25 one-time registration fee; Apple Developer Program normally costs US$99/year. Those publisher charges are separate from app hosting. No store submission or paid purchase has been made.
