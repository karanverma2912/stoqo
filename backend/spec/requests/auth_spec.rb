require "rails_helper"
RSpec.describe "Authentication", type: :request do
  it "signs up, authenticates and revokes the session" do
    post "/api/v1/auth/signup", params: {user: {name: "Gourav", email: "GOURAV@example.test", password: "strong-passphrase-123"}}, as: :json
    expect(response).to have_http_status(:created)
    token = response.parsed_body.dig("data", "token")
    expect(Session.last.token_digest).not_to eq(token)
    headers = {"Authorization" => "Bearer #{token}"}
    get "/api/v1/auth/me", headers: headers
    expect(response.parsed_body.dig("data", "email")).to eq("gourav@example.test")
    delete "/api/v1/auth/logout", headers: headers
    expect(response).to have_http_status(:no_content)
    get "/api/v1/auth/me", headers: headers
    expect(response).to have_http_status(:unauthorized)
  end
  it "rejects an expired session" do
    user = create(:user)
    token = Session.issue!(user)
    user.sessions.update_all(expires_at: 1.day.ago)
    get "/api/v1/auth/me", headers: {"Authorization" => "Bearer #{token}"}
    expect(response).to have_http_status(:unauthorized)
  end
  it "uses database trial configuration" do
    create(:subscription_plan, default_plan: true, trial_days: 17)
    user = create(:user)
    post "/api/v1/businesses", params: {business: {name: "Shop", trial_ends_at: 10.years.from_now}}, headers: {"Authorization" => "Bearer #{Session.issue!(user)}"}, as: :json
    expect(response).to have_http_status(:created)
    expect(Business.last.trial_ends_at).to be_within(10.seconds).of(17.days.from_now)
    expect(BusinessMembership.last.role).to eq("owner")
  end
end
