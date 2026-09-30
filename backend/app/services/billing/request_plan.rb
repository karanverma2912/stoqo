module Billing
  class RequestPlan
    def self.capacity_error(business, plan)
      seats = business.business_memberships.count + business.team_invitations.pending.count
      return "This plan allows #{plan.member_limit} users. Remove team members or revoke pending invitations first." if seats > plan.member_limit
      return "This plan allows #{plan.product_limit} saved products. Choose a plan with more capacity." if plan.product_limit && business.products.count > plan.product_limit
      nil
    end
    def self.call(business:, user:, plan_id:)
      business.with_lock("FOR NO KEY UPDATE") do
        member = business.business_memberships.find_by!(user: user)
        raise Pundit::NotAuthorizedError unless BusinessPolicy.new(member, business).manage?
        plan = SubscriptionPlan.find_by!(id: plan_id, available: true)
        pending = business.subscription_requests.pending.first
        return pending if pending && pending.subscription_plan_id == plan.id
        raise ArgumentError, "Cancel your pending request before choosing a different plan" if pending
        problem = capacity_error(business, plan)
        raise ArgumentError, problem if problem
        request = business.subscription_requests.create!(user: user, subscription_plan: plan, plan_name: plan.name, currency: plan.currency, monthly_price_paise: plan.monthly_price_paise)
        business.activities.create!(user: user, action: "plan_requested", subject_name: plan.name, details: {subscription_request_id: request.id})
        request
      end
    end
  end
end
