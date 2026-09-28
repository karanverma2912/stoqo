# Deployment

## Vercel frontend

Import `karanverma2912/stoqo`; choose root `frontend`, framework Next.js, Node 24. Install `npm ci`, build `npm run build`. Set `API_URL=https://your-rails-service.example` without `/api/v1`. This variable is server-only. No bearer token or database credential belongs in a NEXT_PUBLIC variable. Preview environments should point to a staging API/database, not production.

## Rails on Render/Railway

Create a PostgreSQL database and private Redis instance. Build the backend Dockerfile using `backend/` as the context. Create a web service and a background worker from the same image. The image defaults to Puma; worker command is `bundle exec sidekiq`.

Set environment values from `backend/.env.example`:

- RAILS_ENV=production, DATABASE_URL, REDIS_URL
- SECRET_KEY_BASE generated with `bundle exec rails secret`
- ALLOWED_HOSTS to the API domain(s), comma-separated, without scheme
- FRONTEND_ORIGINS to approved frontend origins (no wildcard)
- S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_ENDPOINT, S3_REGION
- PORT supplied by the host

Run `bundle exec rails db:migrate db:seed` as a release/pre-deploy command. Both processes must share storage credentials. Health check `/up`; this checks Rails boot, not dependency readiness. Use separate dependency checks in monitoring. Production assumes TLS terminates at a trusted proxy. Configure Rails trusted proxies/IP forwarding for your host; otherwise an IP rate limit can group multiple users behind the frontend server.

For Cloudflare R2 use its S3 endpoint and region `auto`. Configure bucket policy, CORS only as needed, and lifecycle/backup settings. Upload validation accepts images only; CSV/XLSX files use the import endpoint. Do not enable the unrestricted Active Storage direct-upload route for clients.

## Launch gate

Before customer onboarding: confirm green backend/frontend CI; run the complete browser signup → business → product → stock in/out → reload flow against staging; test two separate businesses and concurrent stock-out requests; exercise worker imports; verify HTTPS mobile scanning and installation; configure error tracking and backup restore drills; implement account email verification and password reset. Review legal/privacy/support copy for launch. These operational/account recovery tasks are not replaced by a successful frontend build.
