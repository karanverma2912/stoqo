[["Starter", 4900, 3], ["Business", 14900, 10], ["Pro", 29900, 25]].each do |name, price, seats|
  SubscriptionPlan.find_or_create_by!(name: name) do |plan|
    plan.member_limit = seats
    plan.monthly_price_paise = price
    plan.trial_days = 90
    plan.default_plan = name == "Starter"
  end
end

if ENV["STOQO_FREE_PILOT"] == "true"
  SubscriptionPlan.where(default_plan: true).update_all(default_plan: false)
  SubscriptionPlan.find_or_create_by!(name: "Free pilot").update!(monthly_price_paise: 0, member_limit: 10, trial_days: 90, default_plan: true, available: true)
end
