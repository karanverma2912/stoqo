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

The earlier 14 October follow-up passed website typecheck and all 18 website tests. Website and backend source remain unchanged in this continuation.

The quality-gate run at commit `ba6b0802fe33c68caaf951f56471b3e6cb6e4169` passed Rails database migrations and 104 RSpec examples, frontend typecheck/tests/production build, browser workflows, native typecheck/tests/lint and Android JavaScript export. Native Android compilation is a separate gate; a test APK is not a production-signed launch artifact. Physical-device and live-provider testing remain required.

The combined 14 October continuation passed 43 native tests, TypeScript checks, Expo lint, the Android JavaScript export and manual-workflow trigger validation. Regression cases cover realtime reconnects, retired callbacks, persisted-write isolation, stale authentication failures, delayed secure storage, push registration across login/token changes, opt-out, interrupted registration, invalid notification destinations and the actual Expo manifest. Rails and Next.js source were not changed in this continuation. No cloud APK build was started and no production APK/AAB was produced.

## Deployment state

Live account checks on 15 October confirm that the Stoqo Supabase project is healthy. Its private `stoqo` schema belongs to the dedicated `stoqo_app` login role, but it contains **zero application tables**: Rails migrations have not run there. No customer records were created.

The free Render `stoqo-web` service is now live at **https://stoqo-web.onrender.com**. The home page and `/login` returned HTTP 200, and recent error logs were empty. `/api/health` returned HTTP 503 with `{"status":"unavailable"}` because the Rails API is not deployed. Loading the website is not proof that login, stock or billing can work. Reuse this existing website service when connecting the API.

The user's 15 October approval covers storing the saved database password and Rails secret in the connected Render account. The previous permission blocker must not be asked again. Credentials are preserved privately and were not committed. The remaining database connection input is the project's actual **session-pooler hostname**; the saved setup does not contain it, and the available Supabase connection tools do not return the pooler configuration. Obtain the hostname from the project's Connect panel; do not guess it from the project region or reset the database password.

There is still **no published APK or signed launch artifact**. The current Expo CLI reports `Not logged in`, and no Expo project ID is configured. The earlier successful Android-release workflow runs skipped their build while origins were missing; they do not establish that an APK exists. `mobile/production.json` now contains the verified web origin but deliberately leaves `api_url` empty. The release validation continues to stop APK builds until a real API origin is configured.

Next: obtain the session-pooler hostname, deploy the free API using the saved credentials, verify database migrations and the durable worker, connect the website's server-only `API_URL`, confirm `/ready` and `/api/health`, set the native API origin, configure build authentication/signing, build the APK/AAB and test two phones. No paid resources or purchases were selected.

## Inputs and launch gates remaining

1. The Supabase session-pooler hostname, followed by verified Rails API deployment and migrations. Credential-storage authorization has already been received.
2. A server-only Gemini API key from a free API project; Gemini Pro consumer account access does not configure the API here. Enable AI per store only after reviewing Google's API data-use terms.
3. HTTPS email-provider key and verified sender; a support mailbox. Automatic invitation/recovery email cannot be verified until configured.
4. Expo project/Firebase configuration and FCM credentials for background Android push; Apple signing/APNs credentials for iOS. Foreground realtime does not require those push credentials.
5. Expo/build authentication and permanent signing setup, actual signed release artifacts, Android/iPhone and two-device tests, backup/restore exercise, publisher accounts, store listings/privacy declarations and required testing/review.

Set provider spend/overage limits to zero before deployment; free Render plans may bill overages if a payment method is present. The pilot can use free service plans within provider quotas; sleeping services and limits prevent an unlimited, always-on guarantee. Google Play normally has a US$25 one-time registration fee; Apple Developer Program normally costs US$99/year. Those publisher charges are separate from app hosting. No store submission or paid purchase has been made.
