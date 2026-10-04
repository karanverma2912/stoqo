module Reports
  class DailySummary
    def initialize(business:, date:)
      @business = business
      zone = ActiveSupport::TimeZone[business.timezone]
      @date = date.present? ? Date.iso8601(date) : Time.current.in_time_zone(zone).to_date
      @from = zone.local(@date.year, @date.month, @date.day)
      next_day = @date + 1
      @to = zone.local(next_day.year, next_day.month, next_day.day)
    end
    def sales = @business.sales.where(created_at: @from...@to)
    def returns = @business.sale_returns.where(created_at: @from...@to)
    def amount(value) = value.to_d.to_s("F")
    def call
      sale_counts = sales.group(:user_id).count
      sale_totals = sales.group(:user_id).sum(:total)
      discounts = sales.group(:user_id).sum(:discount)
      return_counts = returns.group(:user_id).count
      return_totals = returns.group(:user_id).sum(:amount)
      memberships = @business.business_memberships.pluck(:user_id, :role).to_h
      ids = (memberships.keys + sale_counts.keys + return_counts.keys).uniq
      received = sales.sum(:total)
      refunded = returns.sum(:amount)
      by_payment = sales.group(:payment_method).sum(:total)
      # These are classifications by original bill payment method, not refund tender.
      returned_by_payment = returns.joins(:sale).group("sales.payment_method").sum(:amount)
      {
        date: @date.iso8601, timezone: @business.timezone, currency: @business.currency,
        totals: {bills: sale_counts.values.sum, gross_sales: amount(sales.sum(:subtotal)), discounts: amount(discounts.values.sum),
          sales: amount(received), returns: amount(refunded), return_count: return_counts.values.sum, net: amount(received - refunded)},
        employees: User.where(id: ids).order(:name, :id).map { |user| {
          id: user.id, name: user.name, role: memberships[user.id], bills: sale_counts[user.id] || 0,
          sales: amount(sale_totals[user.id] || 0), discounts: amount(discounts[user.id] || 0),
          return_count: return_counts[user.id] || 0, returns_processed: amount(return_totals[user.id] || 0)
        } },
        payments: %w[cash upi card other].map { |method| {
          method: method, sales: amount(by_payment[method] || 0), returns: amount(returned_by_payment[method] || 0),
          net: amount((by_payment[method] || 0) - (returned_by_payment[method] || 0))
        } }
      }
    end
  end
end
