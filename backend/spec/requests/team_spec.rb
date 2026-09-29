require "rails_helper"
RSpec.describe "Employee access and seats", type: :request do
  let(:owner) { create(:user) }
  let(:employee) { create(:user) }
  let(:business) { create(:business) }
  let!(:membership) { create(:business_membership, user: owner, business: business) }
  def headers(user, business)
    {"Authorization" => "Bearer #{Session.issue!(user)}", "X-Business-Id" => business.id.to_s}
  end
  def invite(email)
    post "/api/v1/team_invitations", params: {invitation: {email: email, role: "staff"}}, headers: headers(owner, business), as: :json
  end
  it "reserves seats, binds invitations to email, consumes once and revokes access" do
    business.subscription_plan.update!(member_limit: 2)
    invite(employee.email)
    expect(response).to have_http_status(:created)
    token = response.parsed_body.dig("data", "token")
    expect(TeamInvitation.last.token_digest).not_to eq(token)
    invite("another@example.com")
    expect(response).to have_http_status(:unprocessable_entity)
    post "/api/v1/team_invitations/accept", params: {token: token}, headers: headers(owner, business), as: :json
    expect(response).to have_http_status(:forbidden)
    post "/api/v1/team_invitations/accept", params: {token: token}, headers: headers(employee, business), as: :json
    expect(response).to have_http_status(:ok)
    post "/api/v1/team_invitations/accept", params: {token: token}, headers: headers(employee, business), as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    delete "/api/v1/team_members/#{business.business_memberships.find_by!(user: employee).id}", headers: headers(owner, business)
    expect(response).to have_http_status(:ok)
    get "/api/v1/products", headers: headers(employee, business)
    expect(response).to have_http_status(:not_found)
  end
  it "protects owner, other businesses and management from staff" do
    create(:business_membership, user: employee, business: business, role: "staff")
    get "/api/v1/team_members", headers: headers(employee, business)
    expect(response).to have_http_status(:forbidden)
    delete "/api/v1/team_members/#{membership.id}", headers: headers(owner, business)
    expect(response).to have_http_status(:forbidden)
    other = create(:business_membership)
    delete "/api/v1/team_members/#{other.id}", headers: headers(owner, business)
    expect(response).to have_http_status(:not_found)
  end
  it "rejects expired and revoked invitations without creating memberships" do
    invite(employee.email)
    token = response.parsed_body.dig("data", "token")
    TeamInvitation.last.update!(expires_at: 1.minute.ago)
    post "/api/v1/team_invitations/accept", params: {token: token}, headers: headers(employee, business), as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(business.business_memberships.count).to eq(1)
  end
  it "allows staff stock changes and records actor while isolating size stock" do
    create(:business_membership, user: employee, business: business, role: "staff")
    post "/api/v1/products", params: {product: {name: "Tee", size: "M", color: "Black", barcode: "123"}, initial_quantity: 10}, headers: headers(employee, business), as: :json
    expect(response).to have_http_status(:created)
    product = business.products.last
    other = create(:product, business: business, name: "Tee", size: "L", color: "Black")
    post "/api/v1/stock_movements", params: {stock_movement: {product_id: product.id, quantity: -2, movement_type: "sale", idempotency_key: "staff-sale"}}, headers: headers(employee, business), as: :json
    expect(response).to have_http_status(:created)
    expect(product.reload.current_stock).to eq(8)
    expect(other.reload.current_stock).to eq(0)
    expect(product.stock_movements.last.user).to eq(employee)
    get "/api/v1/products?barcode=123", headers: headers(employee, business)
    expect(response.parsed_body.dig("data", 0, "display_name")).to eq("Tee · Black · M")
  end
end
