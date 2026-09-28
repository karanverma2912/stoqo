class Api::V1::ReportsController < ApplicationController
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
end
