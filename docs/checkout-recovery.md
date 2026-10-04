# Held bills and checkout recovery

Cashiers can hold up to 10 bills, serve another customer, and resume any held bill. Resuming holds the current cart automatically. Customer details, quantities, agreed prices, discount and payment method travel with the bill. Clearing a cart also clears its customer details.

Drafts belong to the signed-in user and business in the current browser tab. They survive refreshes and navigation using sessionStorage. They are not shared with other employees or devices, and closing the tab may delete them. Completed bills retain the existing server-side owner and employee access rules. Server-backed cross-device drafts are a later extension.

Holding a bill does not reserve stock or generate an invoice. Resume/recovery re-fetches products; insufficient or unavailable stock is highlighted. Staff use current selling prices and cannot recover an owner's custom prices or discounts. The Rails sale transaction remains the authority for prices, permissions and available stock.

Drafts store product identifiers and display names, not purchase costs or stock caches. Versioned validation rejects corrupt storage without silently replacing it. Storage/network failures keep the current cart and held bills intact and show a retry action.

An uncertain sale retains its original idempotency key and prevents holding, modifying or resubmitting the cart with a fresh key. On success the persisted active draft is cleared before the pending key is removed. Reloading and retrying a response lost after server completion retrieves the same bill.

No migration or extra service is required. Verification covers draft refresh, holding/resuming, stock refresh, staff pricing, and a completed sale whose response is lost before the browser receives it.
