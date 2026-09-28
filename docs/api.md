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
