# Product groups, variants and labels

Open Inventory → Sizes & labels.

- Create a product group, enter comma-separated sizes and/or colours, preview the combinations, then edit per-variant price, opening stock, purchase cost, SKU or barcode. Remove combinations that you do not sell before saving.
- Up to 100 variants per group. A blank barcode generates a unique internal `SQ…` identifier; supplied manufacturer barcodes remain unchanged. Duplicate options within a group are rejected case-insensitively, including archived variants.
- Existing products can be selected across search pages and grouped. IDs, names, images, prices, stock movements and saved sale snapshots remain unchanged. Products already in a group are excluded from this picker. Set different sizes/colours in Inventory first if existing items have identical options.
- Owner/admin/manager can create groups, attach products and generate codes. Staff can view groups and print existing codes. All API reads/writes remain business-scoped; database composite foreign keys prevent cross-business associations.
- Setup batches are atomic and protected by request keys, including retried responses after reload. A failed variant rolls back the complete batch, including opening stock. Adding further variants uses the same flow from the group detail.
- Labels: choose products and copies (0 skips a product, up to 100 per product and 300 per batch), optionally show selling price, then print/save PDF. Layout is 50 × 30 mm, three columns on A4 with a 5 mm gap. Print at 100% and turn off browser headers/footers. Codes longer than 16 printable ASCII characters (or 32 digits) require a larger label format and are excluded from this layout; saved codes are never shortened or replaced.
- Labels use Code 128 through JsBarcode, and scanning resolves the exact saved product/variant. Generated identifiers are for store inventory, not manufacturer-issued retail identifiers. Direct Bluetooth/thermal printer integrations and preset adhesive-sheet templates are not included. Check a physical sample on your printer before a bulk run.

Migration: `rails db:migrate`. No backfill modifies existing products. Existing standalone products continue to work normally. Product groups organize existing inventory rows; stock continues to live in the movement ledger for each variant.

The interactive ChatGPT demo uses local browser data. The Rails application provides the server-side authorization, locking and tenant isolation.
