require "rails_helper"
RSpec.describe "Mobile account recovery", type: :request do
  let(:user) { create(:user, password: "original-password-123") }
  it "resets a password once and revokes every device session" do
    tokens = [Session.issue!(user), Session.issue!(user)]
    raw = AccountToken.issue!(user, "password_reset")
    attributes = {token: raw, password: "replacement-password-123", password_confirmation: "replacement-password-123"}
    post "/api/v1/auth/reset_password", params: attributes, as: :json
    expect(response).to have_http_status(:ok)
    expect(user.reload.authenticate("replacement-password-123")).to be_truthy
    expect(user.sessions.count).to eq(0)
    post "/api/v1/auth/reset_password", params: attributes, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    tokens.each do |token|
      get "/api/v1/auth/me", headers: {"Authorization" => "Bearer #{token}"}
      expect(response).to have_http_status(:unauthorized)
    end
  end
  it "does not reveal account existence when mail is unavailable" do
    allow(EmailDelivery).to receive(:configured?).and_return(false)
    responses = [user.email, "absent@example.test"].map do |email|
      post "/api/v1/auth/forgot_password", params: {email: email}, as: :json
      expect(response).to have_http_status(:accepted)
      response.parsed_body
    end
    expect(responses.uniq.length).to eq(1)
    expect(AccountToken.count).to eq(0)
  end
  it "verifies an unexpired token only once" do
    raw = AccountToken.issue!(user, "email_verification")
    post "/api/v1/auth/verify_email", params: {token: raw}, as: :json
    expect(response).to have_http_status(:ok)
    expect(user.reload.email_verified_at).to be_present
    post "/api/v1/auth/verify_email", params: {token: raw}, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end
end
