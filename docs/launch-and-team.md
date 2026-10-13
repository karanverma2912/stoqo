# Team and native launch

See [native launch status](native-launch.md) and [deployment instructions](deployment.md) for the current React Native implementation, invitations, realtime/push, AI and release requirements.

## Barcode and sizes

Camera, barcode photo, keyboard/USB scanner and manual entry use the same exact business-scoped lookup. Known barcode → saved details and stock → Stock in or Sold / stock out → quantity/reason → confirm. Unknown barcode → product form with barcode filled → add name, optional size/colour/prices and opening stock. Stock does not change merely by scanning.

A normal retail barcode is an identifier, not an embedded product catalogue. Product details come from saved inventory. External catalogue autofill is not connected and cannot guarantee data for arbitrary products; purchase price, store selling price and available stock must be supplied by the business.

`products.size` and `products.color` are optional structured columns. Each sellable size/colour is its own stock item with independent SKU, barcode and ledger. Example: Tee / Black / M and Tee / Black / L. Display names combine the base name and options without modifying the base name. Do not reuse a barcode between variants within the same store. Inventory → Sizes & labels now groups these items into product families, supports bulk variant creation and prints internal barcode labels. See product-setup.md.
