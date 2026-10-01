require "rails_helper"

RSpec.describe "Account security", type: :request do
  let(:password) { "original-password-123" }
  let(:user) { create(:user, password: password) }
  let!(:token) { Session.issue!(user) }
  let!(:other_token) { Session.issue!(user) }
  let(:headers) { {"Authorization" => "Bearer #{token}"} }

  it "changes the password, rotates this session and revokes the others" do
    post "/api/v1/auth/change_password", headers: headers,
      params: {current_password: password, password: "new-password-12345", password_confirmation: "new-password-12345"}, as: :json
    expect(response).to have_http_status(:ok)
    replacement = response.parsed_body.dig("data", "token")
    expect(user.reload.authenticate("new-password-12345")).to be_truthy
    expect(user.authenticate(password)).to be_falsey
    [token, other_token].each do |old_token|
      get "/api/v1/auth/me", headers: {"Authorization" => "Bearer #{old_token}"}
      expect(response).to have_http_status(:unauthorized)
    end
    get "/api/v1/auth/me", headers: {"Authorization" => "Bearer #{replacement}"}
    expect(response).to have_http_status(:ok)
  end

  it "leaves credentials and sessions unchanged on invalid confirmation or current password" do
    [
      {current_password: "wrong", password: "new-password-12345", password_confirmation: "new-password-12345"},
      {current_password: password, password: "new-password-12345", password_confirmation: "different-password-123"},
      {current_password: password, password: "short", password_confirmation: "short"}
    ].each do |attributes|
      post "/api/v1/auth/change_password", headers: headers, params: attributes, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(user.reload.authenticate(password)).to be_truthy
      expect(user.sessions.count).to eq(2)
    end
  end

  it "revokes only this user's other sessions after checking their password" do
    stranger = create(:user)
    Session.issue!(stranger)
    post "/api/v1/auth/revoke_other_sessions", headers: headers, params: {current_password: "wrong"}, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(user.sessions.count).to eq(2)
    post "/api/v1/auth/revoke_other_sessions", headers: headers, params: {current_password: password}, as: :json
    expect(response).to have_http_status(:ok)
    expect(user.sessions.count).to eq(1)
    expect(stranger.sessions.count).to eq(1)
    get "/api/v1/auth/me", headers: headers
    expect(response).to have_http_status(:ok)
  end

  it "does not expose tokens in security details and excludes expired sessions" do
    user.sessions.find_by!(token_digest: Digest::SHA256.hexdigest(other_token)).update!(expires_at: 1.day.ago)
    get "/api/v1/auth/security", headers: headers
    expect(response.parsed_body.fetch("data")).to eq("active_sessions" => 1)
    get "/api/v1/auth/security"
    expect(response).to have_http_status(:unauthorized)
  end
end
