# Returns and customer history

Each returned item can be sellable or damaged. Sellable items re-enter stock. Damaged items create a return-in and matching damage movement in the same transaction, leaving available stock unchanged. The original discounted refund calculation and idempotency checks still apply.

Return forms record cash/UPI/card/other as the refund method. This records the operator's action and does not send money. Older returns and legacy API requests retain an unknown method rather than assuming one. Reports show recorded refund methods separately from the original-sale payment breakdown.

Checkout → Customer history searches the exact digits of the phone recorded on bills. Formatting spaces, punctuation and '+' are ignored; country codes are not guessed. Use the same country-code convention for repeat customers. Staff see only their own bills; owner/admin/manager history covers the selected business. History supports paging, receipt opening and sales/return totals. No separate customer account or contact import is required.

Run Rails migrations after pulling. The migration backfills normalized phone numbers on existing bills.
