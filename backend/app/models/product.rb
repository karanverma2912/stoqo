class Product < ApplicationRecord
  belongs_to :business
  belongs_to :category, optional: true
  has_many :stock_movements
  has_one_attached :image
  before_validation { self.sku = sku.presence; self.barcode = barcode.presence }
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
  def category_belongs_to_business
    errors.add(:category, "must belong to this business") if category && category.business_id != business_id
  end
  def safe_image
    return unless image.attached?
    errors.add(:image, "must be JPG, PNG or WebP under 5 MB") unless %w[image/jpeg image/png image/webp].include?(image.content_type) && image.byte_size <= 5.megabytes
  end
end
