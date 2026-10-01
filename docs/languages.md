# App language

Settings → Language controls English/Hindi throughout the browser app. The old
checkout-only selector is removed. The choice is saved with the existing
`stoqo-language` key and syncs across tabs. Reloading keeps the choice. Storage
failures leave the in-memory selector usable. The HTML `lang` attribute follows
it, and language changes do not remount the workspace or clear forms/cart state.

Coverage includes dashboard/navigation, inventory, product/stock/import forms,
variants/labels, checkout/receipts, reports/activity, notifications, subscriptions,
team/account settings, sign-in/sign-up/join, landing and offline screens.
App-authored English strings live at their use sites; Hindi translations are in
`frontend/lib/i18n/hi.json`. Checkout's existing bilingual copy uses the same
provider. Known server-message templates are translated at display time. Unknown
server/validation messages fall back to their original text so detail is not lost.
Add their translations when introducing new messages. Do not translate product,
category, business or employee names, free-text notes, identifiers or CSV headers.

Use `useLanguage().tr("Text")` for labels and `tr("View {name}", {name})` for
interpolations. Keep role/unit/status/payment values stable; translate only their
labels. Dates use the selected locale; currency comes from the business. The
preference is browser-local, not an account-level preference shared across devices.

## Laptop verification

1. Settings → Language → Hindi. Confirm navigation and the open Settings dialog
   update immediately. Close it and inspect inventory, reports, team and plans.
2. Open a product/stock form and verify labels and validation. Existing product
   names and codes must be unchanged. Add stock in Hindi and confirm the ledger.
3. Create a cart, switch language in Settings, and return to checkout. Cart items
   and quantities should remain. Receipts and print labels follow the language.
4. Refresh, open another tab, then switch back to English. Verify both tabs update.
5. In a product form, choose an English or Hindi unit label and verify the same
   canonical unit is stored. Locale must not change API movement types or roles.
6. New browsers default to English. The login page uses this browser's remembered
   preference. No separate language selector is shown in checkout.

Automated checks cover dictionary placeholder consistency and known server
messages. The browser flow switches through Settings, navigates/reloads in Hindi,
updates stock in Hindi, and returns to English before completing other flows.
