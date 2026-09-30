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

## Render production Blueprint handoff

The root `render.yaml` provisions five resources in Singapore: Next.js web,
Rails API, Sidekiq worker, PostgreSQL and a private Key Value queue. The selected
plans are paid; review Render's displayed total before applying. No Stoqo
resources existed in the connected Backend workspace on 30 September 2026.

Open https://dashboard.render.com/blueprint/new?repo=https://github.com/karanverma2912/stoqo
and select the Backend workspace, `main` branch and root `render.yaml`.
Review validation and pricing, then enter these four inputs in Render:

- `S3_ACCESS_KEY_ID`: bucket-scoped object-storage access key.
- `S3_SECRET_ACCESS_KEY`: matching secret; do not commit or paste it in chat.
- `S3_BUCKET`: an existing private bucket for production uploads/import files.
- `S3_ENDPOINT`: the provider's HTTPS S3-compatible endpoint, without the bucket path.

The Blueprint defaults `S3_REGION` to `auto` for R2. For Amazon S3, use the actual
bucket region and regional S3 endpoint. Grant the API/worker only the required
bucket read/write permissions. Configure object versioning/recovery according to
the provider's support. The database URL, Redis URL and shared Rails secret are
wired automatically. The Next.js server reaches Rails over the private network;
customers use only the Next.js public HTTPS URL. Same-origin requests do not need
wildcard CORS. A separate mobile client that calls Rails directly needs its own
explicit origin configuration.

Apply the Blueprint in Render. This requires the Dashboard: the connected MCP
has no Blueprint-apply or background-worker-creation operation. Services use
`autoDeployTrigger: checksPass` for subsequent Git updates. The API pre-deploy
command prepares migrations and seeds plans. Do not run destructive reset tasks.

### Verify before onboarding customers

1. Confirm web, API and worker deploys are live and on the intended commit.
2. Run `bash scripts/check-deployment.sh https://YOUR-WEB.onrender.com`.
3. Sign up with a fresh account; create a business and product; upload an image.
4. Import a small CSV, confirm Sidekiq completes it, then check the import result.
5. Complete a bill, reload, confirm stock/history, and try a return. Confirm a
   second business cannot see the first business's records.
6. Restart API and worker and confirm image/file access and records survive.
7. Check the camera flow on a physical phone over HTTPS.

`/up` remains a process-only liveness check. Rails `/ready` checks PostgreSQL and
Redis; frontend `/api/health` checks connectivity through Next.js to that endpoint.
These return no credentials or internal exception messages. Use `/api/health`
for external uptime monitoring with alerts to an owner-selected destination.
A successful response does not prove Sidekiq is processing jobs or that object
storage works; the import/upload checks above remain necessary. Alert delivery
and an external uptime monitor are not provisioned by this repository.

### Backups and rollback

Before real inventory is entered, confirm database backup retention and recovery
options in Render. Restore a backup into a separate database, point an isolated
staging API at it, and verify product counts, stock movements and bills. Never test
a restore by overwriting production. Record the restore date and result. Configure
and separately exercise object-storage recovery; database backups do not include
uploaded images or import files.

If a release fails, stop further deploys and inspect logs. Roll back the web/API
and worker to a compatible release using Render. Code rollback does not undo
migrations: prefer additive migrations and a forward fix; take a database backup
before a destructive data migration. Do not restore old database data merely to
undo a code release because this could discard subsequent sales.

Account recovery/email verification, monitoring alert delivery, an actual backup
restore drill and physical-device verification remain launch gates. A green build
alone does not establish that Stoqo is ready for paying customers.
