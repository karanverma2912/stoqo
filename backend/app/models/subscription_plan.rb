class SubscriptionPlan < ApplicationRecord
  validates :member_limit, numericality: {only_integer: true, greater_than: 0}
  validates :product_limit, numericality: {only_integer: true, greater_than: 0}, allow_nil: true
  validates :currency, format: {with: /\A[A-Z]{3}\z/}
  validates :name, presence: true
  validates :trial_days, :monthly_price_paise, numericality: {greater_than_or_equal_to: 0, only_integer: true}
end
