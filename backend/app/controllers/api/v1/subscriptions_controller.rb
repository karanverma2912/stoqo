class Api::V1::SubscriptionsController < ApplicationController
  def index
    data({status: current_business.subscription_status, trial_ends_at: current_business.trial_ends_at,
      current_plan: current_business.subscription_plan, plans: SubscriptionPlan.order(:monthly_price_paise), writable: current_business.writable?})
  end
end
