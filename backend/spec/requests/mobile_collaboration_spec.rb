require "rails_helper"

RSpec.describe "Mobile collaboration", type: :request do
  let!(:owner) { create(:user) }
  let!(:teammate) { create(:user) }
  let!(:business) { create(:business) }
  let!(:owner_member) { create(:business_membership, business: business, user: owner, role: "owner") }
  let!(:teammate_member) { create(:business_membership, business: business, user: teammate, role: "admin") }
  def headers(user)
    {"Authorization" => "Bearer #{Session.issue!(user)}", "X-Business-Id" => business.id.to_s}
  end

  it "keeps notification read state private to each user" do
    n = business.notifications.create!(kind: "low_stock", message: "A product is running low")
    patch "/api/v1/notifications/#{n.id}", headers: headers(owner)
    expect(response).to have_http_status(:ok)
    get "/api/v1/notifications", headers: headers(teammate)
    expect(response.parsed_body.fetch("data").first["read_at"]).to be_nil
    expect(response.parsed_body.fetch("meta")["unread"]).to eq(1)
  end

  it "hides sales alerts from staff and rejects foreign-store updates" do
    teammate_member.update!(role: "staff")
    n = business.notifications.create!(kind: "sale_completed", message: "Private sales summary")
    patch "/api/v1/notifications/#{n.id}", headers: headers(teammate)
    expect(response).to have_http_status(:not_found)
    other = create(:business).notifications.create!(kind: "low_stock", message: "Other store")
    patch "/api/v1/notifications/#{other.id}", headers: headers(owner)
    expect(response).to have_http_status(:not_found)
  end

  it "supports separate registrations for two phones and revokes them on logout" do
    token = Session.issue!(owner)
    h = {"Authorization" => "Bearer #{token}"}
    2.times do |i|
      post "/api/v1/devices", params: {device: {installation_id: "phone_installation_#{i}", expo_push_token: "ExpoPushToken[device_#{i}]", platform: "android"}}, headers: h, as: :json
      expect(response).to have_http_status(:created)
    end
    expect(owner.device_registrations.count).to eq(2)
    delete "/api/v1/auth/logout", headers: h
    expect(owner.device_registrations.count).to eq(0)
  end

  it "issues short-lived websocket tickets that can only be redeemed once" do
    post "/api/v1/realtime/tickets", headers: headers(owner), as: :json
    raw = response.parsed_body.dig("data", "ticket")
    expect(SocketTicket.last.token_digest).not_to eq(raw)
    expect(SocketTicket.redeem!(raw).user_id).to eq(owner.id)
    expect(SocketTicket.redeem!(raw)).to be_nil
  end

  it "rejects websocket tickets after logout or expiry" do
    session = Session.find_by!(token_digest: Digest::SHA256.hexdigest(Session.issue!(owner)))
    raw = SocketTicket.issue!(session)
    session.update!(expires_at: 1.minute.ago)
    expect(SocketTicket.redeem!(raw)).to be_nil
  end

  it "preserves the invited-email check and starts access immediately on acceptance" do
    raw = SecureRandom.urlsafe_base64(32)
    invited = create(:user)
    business.team_invitations.create!(email: invited.email, role: "staff", token_digest: Digest::SHA256.hexdigest(raw), expires_at: 1.day.from_now)
    post "/api/v1/team_invitations/accept", params: {token: raw}, headers: headers(owner), as: :json
    expect(response).to have_http_status(:forbidden)
    post "/api/v1/team_invitations/accept", params: {token: raw}, headers: headers(invited), as: :json
    expect(response).to have_http_status(:ok)
    expect(business.business_memberships.find_by!(user: invited).role).to eq("staff")
    expect(invited.reload.email_verified_at).to be_present
  end
end
