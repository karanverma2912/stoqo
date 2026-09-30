class ProductSetupBatch < ApplicationRecord
  belongs_to :business
  belongs_to :user
  belongs_to :product_group
  validates :idempotency_key, presence: true, length: {maximum: 80}
end
