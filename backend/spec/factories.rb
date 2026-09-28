FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "owner#{n}@example.test" }
    name { "Gourav" }
    password { "safe-test-password-123" }
  end
  factory :subscription_plan do
    sequence(:name) { |n| "Starter #{n}" }
    monthly_price_paise { 4900 }
    trial_days { 90 }
  end
  factory :business do
    name { "Everyday Store" }
    subscription_plan
    trial_ends_at { 90.days.from_now }
  end
  factory :business_membership do
    business
    user
    role { "owner" }
  end
  factory :product do
    business
    name { "Everyday Tee" }
    purchase_price { 300 }
    selling_price { 599 }
    low_stock_threshold { 5 }
  end
end
