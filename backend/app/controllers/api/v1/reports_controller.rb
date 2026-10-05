class Api::V1::ReportsController < ApplicationController
  def daily_summary_export
    authorize current_business, :manage?, policy_class: BusinessPolicy
    summary = Reports::DailySummary.new(business: current_business, date: params[:date]).call
    csv = Reports::DailySummaryCsv.call(summary: summary, business_name: current_business.name, language: params[:language])
    response.headers["Cache-Control"] = "private, no-store"
    send_data csv, filename: "stoqo-daily-summary-#{summary[:date]}.csv", type: "text/csv; charset=utf-8"
  end
  def daily_summary
    authorize current_business, :manage?, policy_class: BusinessPolicy
    report = Reports::DailySummary.new(business: current_business, date: params[:date])
    sales = report.sales
    returns = report.returns
    if params[:employee_id].present?
      employee_id = Integer(params[:employee_id].to_s, 10)
      sales = sales.where(user_id: employee_id)
      returns = returns.where(user_id: employee_id)
    end
    sale_rows, sale_meta = daily_page(sales, :sales_page)
    return_rows, return_meta = daily_page(returns, :returns_page)
    data(report.call.merge(
      bills: sale_rows.map { |sale| sale.as_json(only: [:id, :number, :cashier_name, :payment_method, :total, :created_at]) },
      returns: return_rows.includes(:user, :sale).map { |record| {
        id: record.id, sale_id: record.sale_id, number: record.sale.number, seller: record.sale.cashier_name,
        processed_by: record.user.name, amount: record.amount, reason: record.reason, created_at: record.created_at,
        original_payment_method: record.sale.payment_method
      } }, bills_meta: sale_meta, returns_meta: return_meta
    ))
  end
  def index
    authorize current_business, :report?, policy_class: BusinessPolicy
    zone = ActiveSupport::TimeZone[current_business.timezone]
    from = params[:from].present? ? zone.local(*Date.iso8601(params[:from]).then { |d| [d.year, d.month, d.day] }).beginning_of_day : 6.days.ago.in_time_zone(zone).beginning_of_day
    to = params[:to].present? ? zone.local(*Date.iso8601(params[:to]).then { |d| [d.year, d.month, d.day] }).end_of_day : Time.current.in_time_zone(zone).end_of_day
    raise ArgumentError, "Choose a date range of up to 366 days" if to < from || to - from > 366.days
    movements = current_business.stock_movements.where(occurred_at: from..to)
    products = current_business.products.active
    data({from: from, to: to, total_products: products.count, total_units: products.sum(:current_stock),
      inventory_value: products.sum("current_stock * purchase_price"), retail_value: products.sum("current_stock * selling_price"),
      stock_in: movements.where("quantity > 0").sum(:quantity), stock_out: -movements.where("quantity < 0").sum(:quantity),
      adjustments: movements.where(movement_type: "adjustment").sum(:quantity), low_stock: products.low.count, out_of_stock: products.out.count,
      most_active: movements.joins(:product).group("products.id", "products.name").order(Arel.sql("SUM(ABS(quantity)) DESC")).limit(5).pluck("products.name", Arel.sql("SUM(ABS(quantity))")).map { |name, quantity| {name: name, quantity: quantity} }})
  end
  private
  def daily_page(scope, key)
    page = [params.fetch(key, 1).to_i, 1].max
    total = scope.count
    [scope.order(created_at: :desc, id: :desc).limit(10).offset((page - 1) * 10), {page: page, pages: (total / 10.0).ceil, total: total}]
  end
end
