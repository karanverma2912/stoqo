require "csv"
class Api::V1::ProductsController < ApplicationController
  before_action :require_stock!, only: :create
  before_action :require_write!, only: [:update, :generate_barcode]
  def index
    scope = current_business.products.active.includes(:category, image_attachment: :blob)
    if params[:q].present?
      q = "%#{Product.sanitize_sql_like(params[:q].to_s.first(200))}%"
      scope = scope.where("products.name ILIKE :q OR sku ILIKE :q OR barcode ILIKE :q OR size ILIKE :q OR color ILIKE :q", q: q)
    end
    scope = scope.where(product_group_id: nil) if params[:ungrouped] == "true"
    scope = scope.where(product_group_id: params[:product_group_id]) if params[:product_group_id].present?
    scope = scope.where(barcode: params[:barcode]) if params[:barcode].present?
    scope = scope.where(category_id: params[:category_id]) if params[:category_id].present?
    scope = scope.low if params[:filter] == "low"
    scope = scope.out if params[:filter] == "out"
    order = {"name" => "name ASC", "stock" => "current_stock ASC", "newest" => "created_at DESC", "price" => "selling_price DESC"}.fetch(params[:sort], "name ASC")
    products, meta = paginated(scope.order(Arel.sql(order)))
    data(products.map { |p| product_json(p) }, meta: meta)
  end
  def show
    product = current_business.products.find(params[:id])
    data(product_json(product))
  end
  def image
    product = current_business.products.find(params[:id])
    raise ActiveRecord::RecordNotFound unless product.image.attached?
    send_data product.image.download, type: product.image.content_type, disposition: "inline"
  end
  def create
    product = Inventory::CreateProduct.call(business: current_business, user: current_user, attributes: product_params, initial_quantity: params.fetch(:initial_quantity, 0))
    data(product_json(product), status: :created)
  end
  def update
    product = current_business.products.find(params[:id])
    Product.transaction do
      product.update!(product_params)
      current_business.activities.create!(user: current_user, action: "product_updated", subject_name: product.name, details: {product_id: product.id, changes: product.saved_changes.except("updated_at")})
    end
    data(product_json(product))
  end
  def generate_barcode
    product = current_business.products.find(params[:id])
    product.with_lock do
      if product.barcode.blank?
        product.update!(barcode: "SQ#{SecureRandom.hex(6).upcase}")
        current_business.activities.create!(user: current_user, action: "barcode_generated", subject_name: product.name, details: {product_id: product.id})
      end
    end
    data(product_json(product))
  end
  def export
    authorize current_business, :report?, policy_class: BusinessPolicy
    csv = CSV.generate do |out|
      out << ["Product Name", "SKU", "Barcode", "Purchase Price", "Selling Price", "Quantity", "Low Stock Threshold", "Category", "Size", "Color"]
      current_business.products.active.includes(:category).find_each do |p|
        out << [p.name, p.sku, p.barcode, p.purchase_price, p.selling_price, p.current_stock, p.low_stock_threshold, p.category&.name, p.size, p.color].map { |v| v.is_a?(String) && v.match?(/\A[=+@\-\t\r]/) ? "'#{v}" : v }
      end
    end
    send_data csv, filename: "stoqo-inventory-#{Date.current}.csv", type: "text/csv"
  end
  private
  def product_params
    params.require(:product).permit(:name, :size, :color, :description, :sku, :barcode, :purchase_price, :selling_price, :low_stock_threshold, :unit, :status, :category_id, :image)
  end
end
