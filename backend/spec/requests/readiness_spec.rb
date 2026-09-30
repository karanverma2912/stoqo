require "rails_helper"

RSpec.describe "Readiness", type: :request do
  it "checks the database and queue without requiring a session" do
    allow(Sidekiq).to receive(:redis).and_return("PONG")
    get "/ready"
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq("status" => "ready")
    expect(response.headers["Cache-Control"]).to include("no-store")
  end

  it "returns a generic unavailable response without leaking connection details" do
    allow(Sidekiq).to receive(:redis).and_raise(StandardError, "redis://private:secret@queue")
    get "/ready"
    expect(response).to have_http_status(:service_unavailable)
    expect(response.parsed_body).to eq("status" => "unavailable")
  end

  it "keeps process health independent from dependencies" do
    allow(Sidekiq).to receive(:redis).and_raise(StandardError)
    get "/up"
    expect(response).to have_http_status(:ok)
    expect(Sidekiq).not_to have_received(:redis)
  end
end
