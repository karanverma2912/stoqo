[["Starter", 4900, 3], ["Business", 14900, 10], ["Pro", 29900, 25]].each do |name, price, seats|
  SubscriptionPlan.find_or_create_by!(name: name) do |plan|
    plan.member_limit = seats
    plan.monthly_price_paise = price
    plan.trial_days = 90
    plan.default_plan = name == "Starter"
  end
end
