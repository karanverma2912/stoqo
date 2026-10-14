# Stoqo delivery order

Original order: **3 → 4 → 5 → 1 → 2 → 6**.

Update, 14 October 2026: continue repository work and the zero-spend native/server launch requested on 12 October. Push source changes without waiting for GitHub builds. Deployment is still blocked on the specific authorization to store generated database/Rails credentials in Render; live AI, email and background push need provider configuration. See production-status.md for the verified account state. New local commits use Karan Verma <karanverma2912@gmail.com>; do not rewrite existing shared history.

3. Make selling faster — multi-item checkout, quantities, price permissions, saved bills, returns and audit. Implemented; see checkout.md.
4. Improve product setup — group sizes/colours, bulk-create variants, generate and print internal labels. Implemented; see product-setup.md.
5. Finish subscriptions — configurable limits, trial/paid expiry, usage, request history and manual operator activation implemented. Automatic provider billing remains deferred; see subscriptions.md.
1. Go live reliably — Free Render API/website configuration, PostgreSQL jobs/realtime/uploads and deployment/restore runbook prepared. Existing private Supabase schema is healthy but has no application tables yet; no Stoqo Render services exist. Provisioning, migrations, backup/restore and live verification remain.
2. Complete account/team flows — Recovery, verification, invited-email acceptance, password changes, session revocation and role-aware workspace settings are implemented in source. Actual recovery/invitation email delivery awaits a configured HTTPS provider and verified sender. See account-security.md and native-launch.md.
6. Prepare mobile for customers — Expo React Native client and signing/release workflow implemented. Live origins, permanent signed APK/AAB, physical-device camera/printing/voice checks, two-device provider tests and distribution remain.

Each implemented feature gets focused stock-integrity and authorization checks. Source verification does not replace live-provider or physical-device release testing.

App-wide English/Hindi is now configured in Settings; see languages.md. Proposed product improvements and scaling sequence: product-priorities.md.
