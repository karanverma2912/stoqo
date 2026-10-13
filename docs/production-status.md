# Production handoff — 13 October 2026

## Ready in source

- Expo React Native application for Android/iOS with native inventory, scanning, checkout, bill PDFs, returns, team and account workflows.
- Gemini assistant: store/user/role-scoped tools, voice input/read-aloud, explicit confirmations and usage limits. Provider transport is tested with stubs; no live Gemini key is available in this workspace.
- Invitation delivery through HTTPS Resend or SMTP, one-use invited-email acceptance without another administrator approval, recovery and verification email.
- One-use WebSocket tickets, private notification receipts, device/session-scoped Expo background push and receipt handling.
- Retry-safe, persisted mobile write requests and PostgreSQL-backed durable jobs/uploads.
- Free Render API/website configuration, permanent encrypted Android signing service and protected GitHub OIDC release workflow.

## Verification

The quality-gate run at commit `ba6b0802fe33c68caaf951f56471b3e6cb6e4169` passed Rails database migrations and 104 RSpec examples, frontend typecheck/tests/production build, browser workflows, native typecheck/tests/lint and Android JavaScript export. Native Android compilation is a separate gate; a test APK is not a production-signed launch artifact. Physical-device and live-provider testing remain required.

## Deployment state

The existing Stoqo Supabase project has a private `stoqo` schema and a dedicated login role. No customer records were created. Render API creation was rejected by automatic approval review because generated database and Rails credentials would be transmitted to Render without explicit authorization. No Stoqo Render service or production frontend has been provisioned, and no paid resources were selected. Deployment credentials are preserved privately and never committed.

The Android production release deliberately waits while `mobile/production.json` has no confirmed live API/web origins. After authorization: deploy the free API and website, verify the actual session-pooler connection and worker, set origins, build the permanently signed APK/AAB, test two clients against the live API and verify persistent uploads/imports.

## Inputs and launch gates remaining

1. Explicit authorization to store the generated Stoqo database password and Rails secret in the connected Render account.
2. A server-only Gemini API key from a free API project; Gemini Pro consumer account access does not configure the API here. Enable AI per store only after reviewing Google's API data-use terms.
3. HTTPS email-provider key and verified sender; a support mailbox. Automatic invitation/recovery email cannot be verified until configured.
4. Expo project/Firebase configuration and FCM credentials for background Android push; Apple signing/APNs credentials for iOS. Foreground realtime does not require those push credentials.
5. Actual signed release artifacts, Android/iPhone and two-device tests, backup/restore exercise, publisher accounts, store listings/privacy declarations and required testing/review.

Set provider spend/overage limits to zero before deployment; free Render plans may bill overages if a payment method is present. The pilot can use free service plans within provider quotas; sleeping services and limits prevent an unlimited, always-on guarantee. Google Play normally has a US$25 one-time registration fee; Apple Developer Program normally costs US$99/year. Those publisher charges are separate from app hosting. No store submission or paid purchase has been made.
