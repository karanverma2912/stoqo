class Api::V1::DashboardController < ApplicationController
  def show
    products = current_business.products.active
    zone = current_business.timezone
    today = Time.current.in_time_zone(zone).beginning_of_day
    movements = current_business.stock_movements.where(occurred_at: today..)
    data({products: products.count, total_units: products.sum(:current_stock), low_stock: products.low.count,
      out_of_stock: products.out.count, inventory_value: products.sum("current_stock * purchase_price"),
      retail_value: products.sum("current_stock * selling_price"),
      stock_in_today: movements.where("quantity > 0").sum(:quantity), stock_out_today: -movements.where("quantity < 0").sum(:quantity),
      low_products: products.where("current_stock <= low_stock_threshold").order(:current_stock).includes(:category, :supplier, image_attachment: :blob).limit(6).map { |p| product_json(p) },
      recent_movements: current_business.stock_movements.includes(:product, :user).order(occurred_at: :desc).limit(6).map { |m| movement_json(m) }})
  end
end
