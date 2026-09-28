[["Starter", 4900], ["Business", 14900], ["Pro", 29900]].each do |name, price|
  SubscriptionPlan.find_or_create_by!(name: name) do |plan|
    plan.monthly_price_paise = price
    plan.trial_days = 90
    plan.default_plan = name == "Starter"
  end
end
