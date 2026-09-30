class Product < ApplicationRecord
  belongs_to :business
  belongs_to :product_group, optional: true
  belongs_to :category, optional: true
  has_many :stock_movements
  has_one_attached :image
  before_validation { self.sku = sku.to_s.strip.presence; self.barcode = barcode.to_s.strip.presence }
  before_validation { self.size = size.to_s.strip.presence; self.color = color.to_s.strip.presence }
  validate :valid_group_variant
  validates :size, :color, length: {maximum: 60}
  def display_name = [name, color, size].compact_blank.join(" · ")
  validates :name, presence: true, length: {maximum: 200}
  validates :sku, :barcode, uniqueness: {scope: :business_id}, allow_nil: true, length: {maximum: 100}
  validates :purchase_price, :selling_price, :low_stock_threshold, numericality: {greater_than_or_equal_to: 0, less_than: 100_000_000}
  validates :status, inclusion: {in: %w[active archived]}
  validates :unit, length: {minimum: 1, maximum: 30}
  validate :category_belongs_to_business
  validate :safe_image
  scope :active, -> { where(status: "active") }
  scope :low, -> { where("current_stock > 0 AND current_stock <= low_stock_threshold") }
  scope :out, -> { where(current_stock: 0) }
  def stock_status
    current_stock.zero? ? "out" : (current_stock <= low_stock_threshold ? "low" : "healthy")
  end
  private
  def valid_group_variant
    return unless product_group
    errors.add(:product_group, "must belong to this business") if product_group.business_id != business_id
    duplicate = product_group.products.where("lower(COALESCE(size, '')) = ? AND lower(COALESCE(color, '')) = ?", size.to_s.downcase, color.to_s.downcase)
    duplicate = duplicate.where.not(id: id) if persisted?
    errors.add(:base, "This size and colour already exist in the group") if duplicate.exists?
  end
  def category_belongs_to_business
    errors.add(:category, "must belong to this business") if category && category.business_id != business_id
  end
  def safe_image
    return unless image.attached?
    errors.add(:image, "must be JPG, PNG or WebP under 5 MB") unless %w[image/jpeg image/png image/webp].include?(image.content_type) && image.byte_size <= 5.megabytes
  end
end
