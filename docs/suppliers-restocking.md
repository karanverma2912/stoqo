# Suppliers and restocking

Open Inventory → Suppliers & restocking (also available in More). Owners/admins/managers can add or edit supplier contact details, archive/reactivate suppliers, and link products. Only the supplier name is required. Archived suppliers retain existing product links but cannot be newly assigned.

The restock list includes products at or below their low-stock threshold, including zero-stock products. Search, supplier filtering and pagination are supported. Show all products allows linking products that already have healthy stock. The supplier list is searchable and paginated; choose from the currently displayed suppliers.

Receive stock opens the existing stock-in flow, with the selected product and a supplier note. Quantity is the actual delivered amount. Purchase/unit costs remain owner/admin-only. Each delivery uses the existing stock service, audit history and idempotency protection. This release does not create purchase orders or send messages to suppliers.

Supplier/product relationships are protected by model validation and a composite database foreign key. Staff cannot administer suppliers. Expired subscriptions can read but cannot change suppliers or stock.

The shop picker now uses a full-width button and accessible dialog, so clicking its arrow opens it consistently. Switching shops closes product dialogs, clears search and inventory caches, and persists the chosen shop. The picker is also available under More.

Run `bundle exec rails db:migrate` after pulling. This session adds return/customer-history fields and supplier tables/links.
