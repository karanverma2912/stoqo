class Api::V1::ProductGroupsController < ApplicationController
  before_action :require_write!, only: [:create, :add_variants]
  def index
    scope = current_business.product_groups
    if params[:q].present?
      scope = scope.where("name ILIKE ?", "%#{ProductGroup.sanitize_sql_like(params[:q].to_s.first(200))}%")
    end
    groups, meta = paginated(scope.order(:name, :id))
    ids = groups.map(&:id)
    counts = current_business.products.active.where(product_group_id: ids).group(:product_group_id).count
    data(groups.map { |g| g.as_json(only: [:id, :name]).merge(variant_count: counts[g.id] || 0) }, meta: meta)
  end
  def show
    data(serialize(current_business.product_groups.find(params[:id])))
  end
  def create
    group = Inventory::SetupVariants.call(business: current_business, user: current_user, attributes: setup_params.to_h)
    data(serialize(group), status: :created)
  end
  def add_variants
    group = Inventory::SetupVariants.call(business: current_business, user: current_user, group_id: params[:id], attributes: setup_params.to_h)
    data(serialize(group))
  end
  private
  def setup_params
    permitted = params.require(:product_group).permit(:name, :idempotency_key, product_ids: [], variants: [:size, :color, :selling_price, :purchase_price, :low_stock_threshold, :sku, :barcode, :unit, :category_id, :initial_quantity])
    permitted[:variants]&.each { |variant| variant.delete(:purchase_price) } unless costs_allowed?
    permitted
  end
  def serialize(group)
    products = group.products.active.includes(:category, :supplier, image_attachment: :blob).order(:color, :size, :id)
    group.as_json(only: [:id, :name]).merge(variant_count: products.size, products: products.map { |p| product_json(p) })
  end
end
