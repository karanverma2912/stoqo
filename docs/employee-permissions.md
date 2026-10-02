# Employee cost privacy

Purchase prices, movement unit costs and inventory cost valuations are available to owners and admins only. Managers retain stock reports and inventory exports without cost columns. Staff retain stock entry, new-product registration, checkout and their existing bill access.

The API removes cost keys recursively, including nested products, movements and audit changes. Employee product, variant and stock requests cannot set costs; supplied cost attributes are ignored. Product edits preserve existing costs. Employee dashboards show estimated retail value instead of cost value.

Bulk imports and their results require owner/admin access because files and validation errors can contain purchase prices. Background jobs recheck the importer's current role before processing. Cost privacy does not redact free-text notes entered by users; avoid putting confidential prices in shared notes or product descriptions.

No database migration is required. Test with owner/admin and manager/staff accounts in separate browser profiles. Verify product details, dashboard, variant setup, stock-in forms, reports and CSV exports.
