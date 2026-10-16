# Stoqo API readiness schedule

The API already exposes `/up` (Rails liveness) and `/ready` (database readiness).
The native app uses `/ready` to wake the server before store requests. It shares
one request, allows up to 90 seconds for a cold start, and never retries writes
as part of a health check.

The Cloudflare Worker `stoqo-api-keepalive` reads `/ready` every 10 minutes between
07:00 and 23:00 Asia/Kolkata (the last scheduled ping is 22:50). Cron runs in UTC.
It only targets the API; it does not keep the separate Next.js website awake.
No credentials or personal data are passed. There is no public HTTP trigger.

Render Free spins down after 15 minutes without inbound traffic. Health-check
paths alone are not a keepalive. Its 750 free instance hours per month are shared
by all free web services in the workspace. This 16-hour daytime schedule uses
about 480–496 API hours/month, leaving headroom for website use; actual traffic
can keep services running longer. It cannot guarantee uptime after quota
exhaustion, during deploys, or during provider outages. For guaranteed overnight
availability, use an always-on instance plan when the owner chooses to upgrade.

Source: https://render.com/docs/free
Cron: https://developers.cloudflare.com/workers/configuration/cron-triggers/

To disable, clear the Worker's Cron Triggers. Keep deployed schedules synchronized
with `wrangler.jsonc`. No native APK build is needed to change this schedule.

Verification: `node --test ops/keepalive/worker.test.mjs`.

The fetch uses `redirect: "manual"` and rejects non-200 responses, including
redirects. The Workers runtime rejected `redirect: "error"` during the first
scheduled invocation, even though Node's fetch and the type definitions accept
that mode. Validate the deployed handler's outcome as well as its unit tests.

For a local Workers-runtime smoke check, run
`npx wrangler dev --local --test-scheduled` here and request
`http://localhost:8787/cdn-cgi/local/scheduled?format=json`. A successful handler
returns `outcome: ok`. The runtime needs outbound access to the API.

For live verification, query Workers Observability with dataset
`cloudflare-workers`, filtered to `$metadata.service = stoqo-api-keepalive`.
Check both the scheduled event's `outcome` and the logged readiness HTTP status.
