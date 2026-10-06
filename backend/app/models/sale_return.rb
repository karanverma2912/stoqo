class SaleReturn < ApplicationRecord
  validates :refund_method, inclusion: {in: %w[cash upi card other]}, allow_nil: true
  belongs_to :sale
  belongs_to :business
  belongs_to :user
  has_many :sale_return_items
  validates :reason, presence: true, length: {maximum: 500}
  validates :idempotency_key, presence: true, length: {maximum: 80}
end
