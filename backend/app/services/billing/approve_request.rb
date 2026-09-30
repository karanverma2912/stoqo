module Billing
  # Operator-only entry point. Verify payment externally before calling this service.
  # No public API or browser callback can activate a subscription.
  class ApproveRequest
    def self.call(request:, payment_reference:, ends_at:, operator:)
      raise ArgumentError, "A persisted billing operator is required" unless operator.is_a?(User) && operator.persisted? && operator.status == "active"
      reference = payment_reference.to_s.strip
      raise ArgumentError, "Supply the verified payment reference" unless reference.length.between?(3, 200)
      raise ArgumentError, "Supply a future paid-through date" unless ends_at.is_a?(Time) && ends_at > Time.current
      business = request.business
      business.with_lock("FOR NO KEY UPDATE") do
        request.reload
        if request.status == "approved"
          raise ArgumentError, "This request was approved with different payment details" unless request.payment_reference == reference && request.activated_until.to_i == ends_at.to_i
          return request
        end
        raise ArgumentError, "Only pending requests can be approved" unless request.status == "pending"
        plan = request.subscription_plan.reload
        raise ArgumentError, "This plan is no longer offered" unless plan.available?
        raise ArgumentError, "Plan pricing changed. Ask the owner to submit a new request." unless plan.monthly_price_paise == request.monthly_price_paise && plan.currency == request.currency
        problem = RequestPlan.capacity_error(business, plan)
        raise ArgumentError, problem if problem
        raise ArgumentError, "Paid access cannot be shortened" if business.subscription_ends_at && ends_at < business.subscription_ends_at
        request.update!(status: "approved", payment_reference: reference, activated_until: ends_at, resolved_at: Time.current)
        business.update!(subscription_plan: plan, subscription_status: "active", subscription_ends_at: ends_at)
        business.activities.create!(user: operator, action: "subscription_activated", subject_name: plan.name, details: {subscription_request_id: request.id, source: "verified_operator_payment", paid_until: ends_at.iso8601})
        business.notifications.create!(kind: "subscription_activated", message: "#{plan.name} is active until #{ends_at.in_time_zone(business.timezone).to_date}.")
        request
      end
    end
  end
end
