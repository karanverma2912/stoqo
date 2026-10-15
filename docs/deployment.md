# Free pilot deployment

The deployment uses two Render **free** web services (Rails API and Next.js website) and the existing **Stoqo** Supabase project. `render.yaml` contains free-only service plans. No paid database, Redis, background worker or object-store subscription is required.

## Server configuration

Build `backend/Dockerfile` with `backend/` as its Docker context. Startup prepares additive Rails migrations and seeds plans, then starts Puma with the Solid Queue supervisor in async mode. PostgreSQL also stores Solid Cable messages and files; upload storage is capped at 100 MB total and 5 MB per file. A private `stoqo` schema is owned by the dedicated `stoqo_app` database role. It is not exposed by the Supabase Data API. Use the project's IPv4-compatible session pooler, a custom-role username of `stoqo_app.PROJECTREF`, and TLS. Do not reset the Supabase administrative password or expose database credentials to the app.

Required server environment: `RAILS_ENV=production`, `DATABASE_URL`, `DATABASE_SCHEMA=stoqo`, `DATABASE_POOL=12`, `RAILS_MAX_THREADS=3`, `SECRET_KEY_BASE`, `JOB_ADAPTER=solid_queue`, `SOLID_QUEUE_IN_PUMA=true`, `SOLID_QUEUE_SUPERVISOR_MODE=async`, `STORAGE_SERVICE=database`, `WEB_URL`, `FRONTEND_ORIGINS`. Render's public/internal hostnames are admitted by Rails host authorization. `STOQO_FREE_PILOT=true` gives newly created stores an active free plan with ten seats; it does not start paid billing.

Next.js builds with Node 24, `cd frontend && npm ci && npm run build`, and starts with `cd frontend && npm start -- --hostname 0.0.0.0 --port $PORT`. Its server-only `API_URL` points to the Rails HTTPS origin. Set `SUPPORT_EMAIL` to the operator's chosen support mailbox. Public clients only contain HTTPS API/web URLs.

`/up` checks process liveness. `/ready` checks PostgreSQL and durable queue tables. Next.js `/api/health` checks the API through the website. Neither endpoint proves SMTP, Gemini or push credentials work. Database-backed jobs continue after restart while records persist, but pause when the free service sleeps.

## Optional provider activation

- Email: set `MAIL_DELIVERY_ENABLED=true`, `MAIL_FROM` and a server-only `RESEND_API_KEY` for HTTPS delivery, or SMTP credentials on a host that supports them; verify actual invitation/reset delivery before enabling `REQUIRE_EMAIL_VERIFICATION=true`. Free Render restricts outbound SMTP ports; The HTTPS adapter retries with a stable idempotency key and enforces global caps of 80 emails/day and 2,000/month. Keep the provider on its free plan with billing disabled. A verified sender and a free provider quota are required. Passwords and invitation tokens stay server-side.
- Gemini: set a server-only Google AI Studio `GEMINI_API_KEY`, `AI_ENABLED=true`, `GEMINI_MODEL`, and `AI_DAILY_CALL_LIMIT`. Use a project with billing disabled for a free pilot, then opt each store in from Settings. Quota errors stop AI rather than selecting a paid fallback. Free API data-handling terms apply to the store data sent to Gemini.
- Push: configure an Expo project ID, Firebase `google-services.json`, FCM v1 credentials in Expo, and Apple APNs credentials for iOS. Rebuild the native binary with the public project ID/Firebase configuration, grant phone permissions, and register each signed-in device.
- Android signing: EAS holds the canonical Android keystore. Set the website's `ANDROID_RELEASE_CERT_SHA256` to the public certificate pinned in `mobile/production.json`; the association endpoint uses it directly. The protected backend `RELEASE_SIGNING_ENABLED` setting is retained for the alternate GitHub OIDC pipeline. Import the existing EAS key into that pipeline before using it: its signing and APK-verification scripts reject a different certificate. Back up signing credentials and any Rails encryption secret privately.

## Free-tier limits and recovery

Render free web services sleep after inactivity and share a monthly running-hour allowance. Supabase free projects have database/storage/egress limits and may pause when inactive. Two sleeping web services can cause a delayed first request. Render can charge bandwidth/build overages when a payment method is present even on free services. Set the workspace spending limits to zero and verify the billing settings before deployment. No keep-alive workaround is configured. Provider plans must be reviewed before serving real businesses at scale.

Supabase's free plan requires an operator-managed backup strategy. Export the private application schema and data regularly and preserve the Rails secret/signing key. Because files live in PostgreSQL, a complete database backup includes stored file contents. Exercise restoration in a separate database; never overwrite live inventory to test a restore. Record a recovery result before a public rollout.

## Verify a release

Run signup → new store → product/photo → stock movement → bill → return → reload. Confirm imports are processed by the durable worker. Use a second login/WebSocket to confirm realtime invalidations and individual read receipts; remove a member and confirm further access is blocked. Verify account removal and test invitation-email, Gemini and background-push providers after adding credentials. Check the APK on physical phones, including speech/camera permission refusal and interrupted network requests. See [native launch requirements](native-launch.md).
