class StockMovement < ApplicationRecord
  TYPES = %w[initial_stock stock_in stock_out sale purchase adjustment damage return_in return_out other].freeze
  belongs_to :business
  belongs_to :product
  belongs_to :user
  validates :movement_type, inclusion: {in: TYPES}
  validates :quantity, numericality: {other_than: 0, greater_than: -100_000_000, less_than: 100_000_000}
  validates :unit_cost, numericality: {greater_than_or_equal_to: 0}, allow_nil: true
  validates :note, length: {maximum: 1000}
  validates :idempotency_key, presence: true, length: {maximum: 100}
  def readonly?
    persisted?
  end
end
