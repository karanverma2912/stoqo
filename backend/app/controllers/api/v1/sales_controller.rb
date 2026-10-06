class Api::V1::SalesController < ApplicationController
  before_action :require_stock!, only: :create
  before_action :require_write!, only: :return_items
  def index
    scope = visible_sales
    if params[:customer_phone].present?
      phone = params[:customer_phone].to_s.gsub(/[^0-9]/, "")
      raise ArgumentError, "Enter a phone number with 6 to 15 digits" unless phone.length.between?(6, 15)
      scope = scope.where(customer_phone_normalized: phone)
    end
    if params[:q].present?
      q = "%#{Sale.sanitize_sql_like(params[:q].to_s.first(120))}%"
      scope = scope.where("number ILIKE :q OR customer_name ILIKE :q OR customer_phone ILIKE :q", q: q)
    end
    rows, meta = paginated(scope.order(created_at: :desc, id: :desc).includes(:sale_items, sale_returns: [:user, :sale_return_items]))
    if params[:customer_phone].present?
      total = scope.sum(:total)
      returned = current_business.sale_returns.where(sale_id: scope.select(:id)).sum(:amount)
      meta = meta.merge(customer_summary: {bills: scope.count, sales: total, returns: returned, net: total - returned})
    end
    data(rows.map { |sale| serialize(sale) }, meta: meta)
  end
  def show = data(serialize(visible_sales.find(params[:id])))
  def create
    sale = Sales::Checkout.call(business: current_business, user: current_user, attributes: sale_params.to_h)
    data(serialize(sale), status: :created)
  end
  def return_items
    sale = visible_sales.find(params[:id])
    attributes = params.require(:sale_return).permit(:reason, :refund_method, :idempotency_key, items: [:sale_item_id, :quantity, :disposition])
    Sales::ReturnItems.call(sale: sale, user: current_user, attributes: attributes.to_h)
    data(serialize(sale.reload))
  end
  private
  def visible_sales
    scope = current_business.sales
    BusinessPolicy.new(pundit_user, current_business).report? ? scope : scope.where(user: current_user)
  end
  def sale_params
    params.require(:sale).permit(:customer_name, :customer_phone, :payment_method, :discount, :idempotency_key, items: [:product_id, :quantity, :unit_price])
  end
  def serialize(sale)
    sale.as_json(only: [:id, :number, :business_name, :cashier_name, :currency, :customer_name, :customer_phone, :payment_method, :status, :subtotal, :discount, :total, :created_at]).merge(
      items: sale.sale_items.to_a.sort_by(&:id).as_json(only: [:id, :product_id, :name, :sku, :barcode, :unit, :quantity, :returned_quantity, :unit_price, :gross_total, :line_total]),
      returns: sale.sale_returns.map { |r| r.as_json(only: [:id, :reason, :amount, :created_at, :refund_method]).merge(user_name: r.user.name, items: r.sale_return_items.as_json(only: [:sale_item_id, :quantity, :amount, :disposition])) })
  end
end
