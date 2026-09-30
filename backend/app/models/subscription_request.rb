class SubscriptionRequest < ApplicationRecord
  belongs_to :business
  belongs_to :user
  belongs_to :subscription_plan
  validates :status, inclusion: {in: %w[pending approved cancelled]}
  validates :plan_name, :currency, presence: true
  validates :monthly_price_paise, numericality: {only_integer: true, greater_than_or_equal_to: 0}
  scope :pending, -> { where(status: "pending") }
end
