require "rails_helper"
RSpec.describe "Subscription management", type: :request do
  include ActiveSupport::Testing::TimeHelpers
  let(:user) { create(:user) }
  let(:business) { create(:business) }
  let!(:membership) { create(:business_membership, business: business, user: user) }
  let(:plan) { create(:subscription_plan, name: "Business", member_limit: 10) }
  let(:headers) { {"Authorization" => "Bearer #{Session.issue!(user)}", "X-Business-Id" => business.id.to_s} }
  def request_plan(id = plan.id)
    post "/api/v1/subscriptions/requests", params: {plan_id: id}, headers: headers, as: :json
  end
  it "reports expiry accurately while keeping inventory readable" do
    business.update!(trial_ends_at: 1.day.ago)
    get "/api/v1/subscriptions", headers: headers
    expect(response.parsed_body.dig("data", "status")).to eq("expired")
    expect(response.parsed_body.dig("data", "writable")).to eq(false)
    get "/api/v1/products", headers: headers
    expect(response).to have_http_status(:ok)
    post "/api/v1/products", params: {product: {name: "New"}}, headers: headers, as: :json
    expect(response).to have_http_status(:payment_required)
    request_plan
    expect(response).to have_http_status(:created)
    expect(business.reload.writable?).to eq(false)
  end
  it "deduplicates requests, allows cancellation and never grants access" do
    2.times { request_plan; expect(response).to have_http_status(:created) }
    expect(business.subscription_requests.count).to eq(1)
    expect(business.reload.subscription_plan).not_to eq(plan)
    request = business.subscription_requests.first
    2.times do
      delete "/api/v1/subscriptions/requests/#{request.id}", headers: headers
      expect(response).to have_http_status(:ok)
    end
    expect(request.reload.status).to eq("cancelled")
    request_plan
    expect(business.subscription_requests.pending.count).to eq(1)
  end
  it "blocks staff requests and conceals management history" do
    request_plan
    membership.update!(role: "staff")
    request_plan
    expect(response).to have_http_status(:forbidden)
    get "/api/v1/subscriptions", headers: headers
    expect(response.parsed_body.dig("data", "can_manage")).to eq(false)
    expect(response.parsed_body.dig("data", "requests")).to eq([])
    expect(response.parsed_body.dig("data", "pending_request")).to be_nil
  end
  it "rejects insufficient seat capacity, including pending invitations" do
    create(:business_membership, business: business)
    business.team_invitations.create!(email: "new@example.test", role: "staff", token_digest: "example", expires_at: 1.day.from_now)
    plan.update!(member_limit: 2)
    request_plan
    expect(response).to have_http_status(:unprocessable_entity)
    expect(business.subscription_requests.count).to eq(0)
  end
  it "rejects foreign cancellations and unavailable plans" do
    foreign_business = create(:business)
    foreign_user = create(:user)
    create(:business_membership, business: foreign_business, user: foreign_user)
    foreign = Billing::RequestPlan.call(business: foreign_business, user: foreign_user, plan_id: plan.id)
    delete "/api/v1/subscriptions/requests/#{foreign.id}", headers: headers
    expect(response).to have_http_status(:not_found)
    plan.update!(available: false)
    request_plan
    expect(response).to have_http_status(:not_found)
  end
  it "requires audited operator approval and expires paid access on time" do
    request_plan
    request = business.subscription_requests.first
    operator = create(:user, name: "Billing operator")
    ends_at = 30.days.from_now.change(usec: 0)
    2.times { Billing::ApproveRequest.call(request: request, operator: operator, payment_reference: "verified-payment-1", ends_at: ends_at) }
    expect(business.reload.subscription_plan).to eq(plan)
    expect(business.writable?).to eq(true)
    expect(business.activities.where(action: "subscription_activated").count).to eq(1)
    expect(business.activities.find_by(action: "subscription_activated").user).to eq(operator)
    travel_to(ends_at + 1.second) { expect(business.reload.writable?).to eq(false) }
  end
  it "rechecks capacity at approval and leaves the subscription unchanged on failure" do
    plan.update!(product_limit: 1)
    request_plan
    create_list(:product, 2, business: business)
    expect { Billing::ApproveRequest.call(request: business.subscription_requests.first, operator: user, payment_reference: "payment-2", ends_at: 30.days.from_now) }.to raise_error(ArgumentError, /saved products/)
    expect(business.reload.subscription_status).to eq("trial")
  end
  it "enforces product limits inside creation and rolls back bulk variants" do
    business.subscription_plan.update!(product_limit: 1)
    post "/api/v1/product_groups", params: {product_group: {name: "Tees", idempotency_key: "limit", variants: [{size: "S", initial_quantity: 1}, {size: "M", initial_quantity: 1}]}}, headers: headers, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(business.products.count).to eq(0)
    Inventory::CreateProduct.call(business: business, user: user, attributes: {name: "One"})
    expect { Inventory::CreateProduct.call(business: business, user: user, attributes: {name: "Two"}) }.to raise_error(Inventory::AdjustStock::InvalidMovement, /saved products/)
    expect(business.products.count).to eq(1)
  end
end
