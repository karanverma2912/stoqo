class Api::V1::StockMovementsController < ApplicationController
  before_action :require_stock!, only: :create
  def index
    scope = current_business.stock_movements.includes(:product, :user).order(occurred_at: :desc, id: :desc)
    scope = scope.where(product_id: current_business.products.find(params[:product_id]).id) if params[:product_id].present?
    rows, meta = paginated(scope)
    data(rows.map { |m| movement_json(m) }, meta: meta)
  end
  def create
    p = params.require(:stock_movement).permit(:product_id, :quantity, :movement_type, :note, :unit_cost, :idempotency_key)
    p.delete(:unit_cost) unless costs_allowed?
    product = current_business.products.active.find(p.delete(:product_id))
    movement = Inventory::AdjustStock.call(product: product, user: current_user, **p.to_h.symbolize_keys)
    data({movement: movement_json(movement), product: product_json(product.reload)}, status: :created)
  end
end
