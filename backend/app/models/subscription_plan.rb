class SubscriptionPlan < ApplicationRecord
  validates :member_limit, numericality: {only_integer: true, greater_than: 0}
  validates :name, presence: true
  validates :trial_days, :monthly_price_paise, numericality: {greater_than_or_equal_to: 0, only_integer: true}
end
