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
  it "lets the owner change roles, records the actor and immediately updates API permissions" do
    member = create(:business_membership, user: employee, business: business, role: "staff")
    employee_headers = headers(employee, business)
    patch "/api/v1/team_members/#{member.id}", params: {membership: {role: "manager"}}, headers: headers(owner, business), as: :json
    expect(response).to have_http_status(:ok)
    expect(member.reload.role).to eq("manager")
    expect(business.activities.last.action).to eq("employee_role_changed")
    expect(business.activities.last.user).to eq(owner)
    get "/api/v1/reports", headers: employee_headers
    expect(response).to have_http_status(:ok)
    patch "/api/v1/team_members/#{member.id}", params: {membership: {role: "staff"}}, headers: headers(owner, business), as: :json
    get "/api/v1/reports", headers: employee_headers
    expect(response).to have_http_status(:forbidden)
  end

  it "prevents owner assignment, self changes and cross-business updates" do
    member = create(:business_membership, user: employee, business: business, role: "staff")
    patch "/api/v1/team_members/#{member.id}", params: {membership: {role: "owner"}}, headers: headers(owner, business), as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    patch "/api/v1/team_members/#{membership.id}", params: {membership: {role: "staff"}}, headers: headers(owner, business), as: :json
    expect(response).to have_http_status(:forbidden)
    other = create(:business_membership)
    patch "/api/v1/team_members/#{other.id}", params: {membership: {role: "staff"}}, headers: headers(owner, business), as: :json
    expect(response).to have_http_status(:not_found)
    patch "/api/v1/team_members/#{member.id}", params: {membership: {role: "admin"}}, headers: headers(employee, business), as: :json
    expect(response).to have_http_status(:forbidden)
    expect(member.reload.role).to eq("staff")
  end

  it "limits admins to staff and manager access, including invitations" do
    admin = create(:user)
    create(:business_membership, business: business, user: admin, role: "admin")
    another_admin = create(:business_membership, business: business, role: "admin")
    member = create(:business_membership, business: business, user: employee, role: "staff")
    admin_headers = headers(admin, business)
    patch "/api/v1/team_members/#{member.id}", params: {membership: {role: "admin"}}, headers: admin_headers, as: :json
    expect(response).to have_http_status(:forbidden)
    delete "/api/v1/team_members/#{another_admin.id}", headers: admin_headers
    expect(response).to have_http_status(:forbidden)
    patch "/api/v1/team_members/#{another_admin.id}", params: {membership: {role: "staff"}}, headers: admin_headers, as: :json
    expect(response).to have_http_status(:forbidden)
    post "/api/v1/team_invitations", params: {invitation: {email: "newadmin@example.test", role: "admin"}}, headers: admin_headers, as: :json
    expect(response).to have_http_status(:forbidden)
    invitation = business.team_invitations.create!(email: "invited-admin@example.test", role: "admin", token_digest: SecureRandom.hex(32), expires_at: 1.day.from_now)
    delete "/api/v1/team_invitations/#{invitation.id}", headers: admin_headers
    expect(response).to have_http_status(:forbidden)
    patch "/api/v1/team_members/#{member.id}", params: {membership: {role: "manager"}}, headers: admin_headers, as: :json
    expect(response).to have_http_status(:ok)
    get "/api/v1/team_members", headers: admin_headers
    expect(response.parsed_body.dig("data", "role_options")).to eq(%w[staff manager])
    own_row = response.parsed_body.dig("data", "members").find { |row| row.dig("user", "id") == admin.id }
    expect(own_row["can_remove"]).to eq(false)
  end

end
