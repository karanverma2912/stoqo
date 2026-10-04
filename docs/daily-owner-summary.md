# Daily owner summary

Owners and admins can open Reports → Daily store summary. The date uses the business timezone, with a half-open local-day range so midnight records appear exactly once. Other inventory report date filters remain independent.

- Gross sales: bill subtotals before discounts.
- Sales after discounts: sum of completed bill totals created on the selected day, including bills later returned.
- Returns processed: return amounts created on the selected day, even when the original bill is older.
- Sales minus returns: daily sales after discounts minus daily returns; may be negative. This is neither profit nor a cash reconciliation.
- Employee sales belong to the original seller. Return activity belongs to the employee who processed the return. Former members with activity remain visible.
- Cash, UPI, card and other payment breakdowns classify returns using the original bill payment method. Actual refund tender is not recorded yet, so these figures must not be treated as cash-drawer balances or confirmed refund payments.

The employee filter applies only to the paginated bill/return lists, not store-wide totals. Clicking a transaction opens the existing receipt and return flow. Current employee names appear in summaries; historical cashier names remain on bills. Staff/manager requests to the summary endpoint are denied. Every query is scoped to the current business.

API: GET /api/v1/reports/daily_summary?date=YYYY-MM-DD&employee_id=ID&sales_page=1&returns_page=1. Each list has 10 rows per page. Summaries use grouped SQL rather than loading every bill. Read-only subscriptions retain reporting access.

After pulling, run `cd backend && bundle exec rails db:migrate` for the daily reporting indexes, then restart frontend/backend. No billing or external messaging integration is required.
