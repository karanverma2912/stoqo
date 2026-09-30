namespace :billing do
  desc "List pending plan requests for operator review (no emails are sent)"
  task requests: :environment do
    SubscriptionRequest.pending.includes(:business, :user).order(:created_at).find_each do |request|
      puts({id: request.id, business: request.business.name, requester: request.user.email, plan: request.plan_name,
        price_minor_units: request.monthly_price_paise, currency: request.currency, created_at: request.created_at}.to_json)
    end
  end
  desc "Activate a request AFTER independently verifying payment; args: id,reference,ISO8601 paid_until,operator_email"
  task :approve, [:id, :reference, :paid_until, :operator_email] => :environment do |_task, args|
    request = SubscriptionRequest.find(args.fetch(:id))
    operator = User.find_by!(email: args.fetch(:operator_email).strip.downcase)
    Billing::ApproveRequest.call(request: request, operator: operator, payment_reference: args.fetch(:reference), ends_at: Time.iso8601(args.fetch(:paid_until)))
    puts "Request #{request.id} approved through #{request.activated_until.iso8601}"
  end
end
