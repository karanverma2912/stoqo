class Api::V1::BusinessesController < ApplicationController
  def index
    data(current_user.business_memberships.includes(business: :subscription_plan).map { |m| m.business.as_json.merge(role: m.role) })
  end
  def create
    plan = SubscriptionPlan.find_by!(default_plan: true, available: true)
    business = Business.transaction do
      b = Business.create!(params.require(:business).permit(:name, :business_type, :currency, :timezone, :country).merge(subscription_plan: plan, trial_ends_at: plan.trial_days.days.from_now))
      b.business_memberships.create!(user: current_user, role: "owner")
      b
    end
    data(business, status: :created)
  end
  def update
    raise ActiveRecord::RecordNotFound unless params[:id].to_s == current_business.id.to_s
    authorize current_business, :manage?, policy_class: BusinessPolicy
    current_business.update!(params.require(:business).permit(:name, :business_type, :timezone))
    data(current_business)
  end
end
