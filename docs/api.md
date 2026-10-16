# API v1

All JSON success responses: `{ "data": ..., "meta": ... }`.
Errors: `{ "error": { "code": "validation_error", "message": "...", "details": {} } }`.
Authenticated requests require `Authorization: Bearer <token>`. Business routes additionally require `X-Business-Id`. Browser clients use `/api/backend/*`, which manages the HttpOnly cookie. 401 means sign in, 403 denied permission, 404 not found/inaccessible, 402 expired trial write, 422 invalid input, 429 rate limited.

## Request limits

Limits apply on the server before route handlers run. Overlapping limits all apply; blocked requests do not perform the requested operation. Windows are fixed, so a short burst can straddle a window boundary.

| Traffic | Scope | Limit |
|---|---|---|
| API requests | IP | 600 / minute |
| Auth POST requests | IP | 20 / minute |
| Signup | IP | 5 / 10 minutes |
| Login | Normalized email | 10 / 5 minutes |
| Password recovery / email verification | IP | 10 / 10 minutes |
| Forgot-password emails | Normalized email | 3 / 10 minutes |
| API requests with a session | Session | 240 / minute |
| Writes with a session | Session | 90 / minute |
| Assistant messages | Session | 8 / minute |
| Android signing credentials | IP | 10 / minute |

Email and session discriminators are SHA-256 hashes; passwords and raw tokens are never cache keys. Login normalization matches authentication (`strip.downcase`). JSON and form bodies are supported. On Render, IP limits use the edge-set `CF-Connecting-IP`; elsewhere they use the socket address and ignore visitor-supplied forwarding headers. Keep direct untrusted traffic away from the Render private network. The web proxy's IP bucket is shared by web visitors when it does not forward an edge identity; email/session limits still apply separately.

`GET /up`, `GET /ready` and CORS preflight are outside API limits. The scheduled 10-minute readiness check does not consume store quotas. A 429 has `Cache-Control: no-store`, `Retry-After` in seconds, `RateLimit-Limit`, `RateLimit-Remaining: 0` and `RateLimit-Reset` (Unix seconds). The JSON error includes `code: rate_limited`, empty `details`, and numeric `retry_after`. The native app shows the wait and does not automatically retry a blocked query or mutation. Explicit retries of stock/sale writes retain their existing idempotency keys.

The current free pilot has one Puma process and a bounded 8 MB in-process limiter cache, reset by a server restart/deploy. Before scaling to multiple processes or instances, configure `RATE_LIMIT_REDIS_URL` with a dedicated Redis database for shared counters (`REDIS_URL` is accepted as a fallback). No Redis service or paid resource is provisioned by this change. Redis cache availability must be monitored: Rails' Redis cache fails open during connection failures.

| Method | Path under `/api/v1` | Purpose |
|---|---|---|
| POST | auth/signup | `{user:{name,email,password}}`; 12–72 character password |
| POST | auth/login | `{email,password}` |
| GET / DELETE | auth/me / auth/logout | Current identity / revoke session |
| GET / POST | businesses | Membership businesses / create owned business |
| PATCH | businesses/:id | Update name/type/timezone |
| GET / POST | categories | List/create optional categories |
| GET | products | q, barcode, category_id, filter=low/out, sort=name/stock/newest/price, page, per_page |
| POST | products | `{product:{name,...},initial_quantity:20}` or multipart |
| GET / PATCH | products/:id | View/edit catalog, not quantity |
| GET | products/export | Formula-safe CSV |
| GET / POST | stock_movements | Paginated history / signed movement |
| GET | dashboard | Current inventory and today's movements in business timezone |
| GET | reports | from/to ISO dates; max 366 days |
| GET | activities | Paginated general audit history |
| POST / GET | imports / imports/:id | Multipart file / asynchronous result |
| GET / PATCH | notifications / notifications/:id | Workspace notifications / mark read |
| GET | team_members | Membership list (owner/admin) |
| GET | subscriptions | Current status and database-configured plans |

Example stock request:
```json
{"stock_movement":{"product_id":42,"quantity":-5,"movement_type":"sale","idempotency_key":"a-unique-request-uuid","note":"Order #1024"}}
```
Returns movement plus updated product. Reuse the UUID on a transport retry. A new logical change needs a new UUID.

List metadata: page, per_page (1–100), total, pages. There are no delete endpoints for ledger records. Archive a product with `status: archived` when necessary; history remains.

## Native collaboration and account endpoints

| Method | Path under `/api/v1` | Purpose |
|---|---|---|
| POST | auth/forgot_password | Uniform response; queues email when configured |
| POST | auth/reset_password | One-use token + new password/confirmation; revokes sessions |
| POST | auth/verify_email | Redeem verification token |
| POST | auth/request_verification | Signed-in verification request |
| DELETE | auth/account | Password + typed DELETE + owned-store closure confirmation |
| POST / DELETE | devices / devices/:id | Register Expo token for this user/session/installation; remove own device |
| POST | realtime/tickets | Issue 60-second one-use socket ticket |
| GET | assistant/capabilities | Availability, help and tools allowed for current role |
| POST | assistant/messages | Store-scoped chat; returns reply and proposals |
| POST | assistant/actions/:id/confirm | Confirm this user's pending task; recheck role/plan/expiry |
| DELETE | assistant/actions/:id | Cancel this user's pending task |
| POST / DELETE | team_invitations / team_invitations/:id | Invite/revoke; queues email when configured |
| POST | team_invitations/accept | Redeem token using invited-email account; no second admin approval |
| GET | products/:id/image | Authenticated image bytes |

Native sockets connect to `/cable?ticket=...` and subscribe to `WorkspaceChannel` with `business_id` and to `UserChannel`. Payloads invalidate cached data instead of embedding private stock or financial fields. `/notifications` serializes only the current user's read receipt and returns `meta.unread`. Reading on one device broadcasts a read update to that user's other devices.

Native product creation also sends a top-level `idempotency_key`; retries return the same product and opening stock. Product-family, checkout and return requests likewise freeze their payload and request key until a confirmed result is received.
