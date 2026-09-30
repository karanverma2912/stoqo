class Api::V1::SubscriptionsController < ApplicationController
  def index
    business = current_business
    plan = business.subscription_plan
    manager = BusinessPolicy.new(pundit_user, business).manage?
    end_date = business.subscription_status == "trial" ? business.trial_ends_at : business.subscription_ends_at
    plans = SubscriptionPlan.where(available: true).order(:monthly_price_paise, :id)
    requests, meta = manager ? paginated(business.subscription_requests.order(created_at: :desc, id: :desc)) : [[], {}]
    data({status: business.subscription_state, billing_status: business.subscription_status, trial_ends_at: business.trial_ends_at, subscription_ends_at: business.subscription_ends_at,
      days_remaining: end_date ? [((end_date - Time.current) / 1.day).ceil, 0].max : nil,
      current_plan: plan_json(plan), plans: plans.map { |p| plan_json(p).merge(capacity_error: Billing::RequestPlan.capacity_error(business, p)) },
      usage: {members: business.business_memberships.count, pending_invitations: business.team_invitations.pending.count, products: business.products.count},
      writable: business.writable?, can_manage: manager, payment_mode: "manual_review", checkout_available: false,
      pending_request: manager ? request_json(business.subscription_requests.pending.first) : nil,
      requests: requests.map { |r| request_json(r) }}, meta: meta)
  end
  def request_plan
    request = Billing::RequestPlan.call(business: current_business, user: current_user, plan_id: params.require(:plan_id))
    data(request_json(request), status: :created)
  end
  def cancel_request
    authorize current_business, :manage?, policy_class: BusinessPolicy
    current_business.with_lock("FOR NO KEY UPDATE") do
      request = current_business.subscription_requests.find(params[:id])
      raise ArgumentError, "Only a pending request can be cancelled" unless %w[pending cancelled].include?(request.status)
      unless request.status == "cancelled"
        request.update!(status: "cancelled", resolved_at: Time.current)
        current_business.activities.create!(user: current_user, action: "plan_request_cancelled", subject_name: request.plan_name, details: {subscription_request_id: request.id})
      end
      data(request_json(request))
    end
  end
  private
  def plan_json(plan)
    plan.as_json(only: [:id, :name, :monthly_price_paise, :currency, :member_limit, :product_limit, :trial_days, :available])
  end
  def request_json(request)
    request&.as_json(only: [:id, :subscription_plan_id, :plan_name, :monthly_price_paise, :currency, :status, :created_at, :resolved_at, :activated_until])
  end
end
