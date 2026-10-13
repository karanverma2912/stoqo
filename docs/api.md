# API v1

All JSON success responses: `{ "data": ..., "meta": ... }`.
Errors: `{ "error": { "code": "validation_error", "message": "...", "details": {} } }`.
Authenticated requests require `Authorization: Bearer <token>`. Business routes additionally require `X-Business-Id`. Browser clients use `/api/backend/*`, which manages the HttpOnly cookie. 401 means sign in, 403 denied permission, 404 not found/inaccessible, 402 expired trial write, 422 invalid input, 429 rate limited.

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
