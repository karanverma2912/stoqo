class SubscriptionPlan < ApplicationRecord
  validates :name, presence: true
  validates :trial_days, :monthly_price_paise, numericality: {greater_than_or_equal_to: 0, only_integer: true}
end
