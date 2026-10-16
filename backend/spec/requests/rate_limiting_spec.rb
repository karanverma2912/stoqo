require "rails_helper"

RSpec.describe "API rate limiting", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  around do |example|
    travel_to(Time.utc(2026, 10, 16, 12, 0, 5)) { example.run }
  end

  # Exercise the real middleware with a sentinel app to check exact boundaries
  # without making hundreds of database writes or password hashes.
  def probe(path, method: "GET", ip: "192.0.2.10", token: nil, body: nil, headers: {})
    @reached ||= 0
    app = Rack::Attack.new(->(_env) { @reached += 1; [200, {}, ["ok"]] })
    env = Rack::MockRequest.env_for(path, method: method, input: body&.to_json,
      "REMOTE_ADDR" => ip, "CONTENT_TYPE" => "application/json",
      "HTTP_AUTHORIZATION" => token && "Bearer #{token}")
    app.call(env.merge(headers))
  end

  it "limits JSON logins by normalized account even across different IPs" do
    10.times do |n|
      expect(probe("/api/v1/auth/login", method: "POST", ip: "192.0.2.#{n + 1}",
        body: {email: n.even? ? "  OWNER@EXAMPLE.TEST " : "owner@example.test"}).first).to eq(200)
    end
    status, headers, body = probe("/api/v1/auth/login", method: "POST", ip: "192.0.2.200", body: {email: "owner@example.test"})
    expect(status).to eq(429)
    expect(@reached).to eq(10)
    expect(headers).to include("retry-after" => "295", "ratelimit-limit" => "10", "ratelimit-remaining" => "0", "cache-control" => "no-store")
    expect(JSON.parse(body.join)).to include("error" => hash_including("code" => "rate_limited", "retry_after" => 295, "details" => {}))
    expect(probe("/api/v1/auth/login", method: "POST", body: {email: "another@example.test"}).first).to eq(200)
    travel 296.seconds
    expect(probe("/api/v1/auth/login", method: "POST", body: {email: "owner@example.test"}).first).to eq(200)
  end

  it "stops IP login bursts even when email and untrusted forwarding headers change" do
    20.times do |n|
      expect(probe("/api/v1/auth/login", method: "POST", body: {email: "person#{n}@example.test"},
        headers: {"HTTP_X_FORWARDED_FOR" => "203.0.113.#{n + 1}", "HTTP_FORWARDED" => "for=203.0.113.#{n + 1}"}).first).to eq(200)
    end
    expect(probe("/api/v1/auth/login", method: "POST", body: {email: "new@example.test"}).first).to eq(429)
    expect(@reached).to eq(20)
  end

  it "shares login quotas across route formats, trailing slashes, JSON, forms and query parameters" do
    8.times { expect(probe("/api/v1/auth/login", method: "POST", body: {email: "owner@example.test"}).first).to eq(200) }
    expect(probe("/api/v1/auth/login.json/", method: "POST", body: {email: "owner@example.test"}).first).to eq(200)
    expect(probe("/api/v1/auth/login?email=OWNER%40example.test", method: "POST").first).to eq(200)
    expect(probe("/api//v1/auth//login.xml/", method: "POST", body: {email: "owner@example.test"}).first).to eq(429)
    env = Rack::MockRequest.env_for("/api/v1/auth/login", method: "POST", input: "email=owner%40example.test",
      "REMOTE_ADDR" => "192.0.2.11", "CONTENT_TYPE" => "application/x-www-form-urlencoded")
    expect(Rack::Attack.new(->(_) { [200, {}, ["ok"]] }).call(env).first).to eq(429)
  end

  it "limits signups and recovery without mixing their account quotas" do
    5.times { expect(probe("/api/v1/auth/signup", method: "POST").first).to eq(200) }
    expect(probe("/api/v1/auth/signup", method: "POST").first).to eq(429)
    expect(probe("/api/v1/auth/login", method: "POST", body: {email: "owner@example.test"}).first).to eq(200)
    3.times { expect(probe("/api/v1/auth/forgot_password", method: "POST", body: {email: "OWNER@example.test "}).first).to eq(200) }
    expect(probe("/api/v1/auth/forgot_password", method: "POST", ip: "192.0.2.20", body: {email: "owner@example.test"}).first).to eq(429)
    expect(probe("/api/v1/auth/forgot_password", method: "POST", body: {email: "other@example.test"}).first).to eq(200)
  end

  it "limits repeated recovery token attempts without requiring a valid email" do
    10.times { expect(probe("/api/v1/auth/reset_password", method: "POST", body: {token: "bad"}).first).to eq(200) }
    expect(probe("/api/v1/auth/verify_email", method: "POST", body: {token: "bad"}).first).to eq(429)
  end

  it "stops write bursts before the write app runs and leaves reads available" do
    token = "a" * 64
    90.times { expect(probe("/api/v1/stock_movements", method: "POST", token: token).first).to eq(200) }
    expect(probe("/api/v1/sales", method: "POST", token: token).first).to eq(429)
    expect(@reached).to eq(90)
    expect(probe("/api/v1/products", token: token).first).to eq(200)
    expect(probe("/api/v1/sales", method: "POST", token: "b" * 64).first).to eq(200)
  end

  it "limits session reads across IPs and business headers" do
    240.times do |n|
      expect(probe("/api/v1/products", token: "a" * 64, ip: "192.0.2.#{n % 200 + 1}", headers: {"HTTP_X_BUSINESS_ID" => n.to_s}).first).to eq(200)
    end
    expect(probe("/api/v1/dashboard", token: "a" * 64).first).to eq(429)
    expect(probe("/api/v1/products", token: "b" * 64).first).to eq(200)
  end

  it "caps unauthenticated API traffic while keeping readiness, process health and preflight available" do
    600.times { expect(probe("/api/v1/products").first).to eq(200) }
    expect(probe("/api/v1/products").first).to eq(429)
    expect(probe("/ready").first).to eq(200)
    expect(probe("/up").first).to eq(200)
    expect(probe("/api/v1/products", method: "OPTIONS").first).to eq(200)
    expect(probe("/api/v1/products", ip: "192.0.2.20").first).to eq(200)
  end

  it "retains the assistant and signing endpoint limits" do
    8.times { expect(probe("/api/v1/assistant/messages", method: "POST", token: "a" * 64).first).to eq(200) }
    expect(probe("/api/v1/assistant/messages", method: "POST", token: "a" * 64).first).to eq(429)
    10.times { expect(probe("/api/v1/releases/android_credentials", method: "POST").first).to eq(200) }
    expect(probe("/api/v1/releases/android_credentials", method: "POST").first).to eq(429)
    expect(probe("/api/v1/releases/android_credentials", method: "OPTIONS").first).to eq(200)
  end

  it "uses the Render edge IP rather than a visitor-supplied forwarding chain" do
    original = ENV["RENDER"]
    ENV["RENDER"] = "true"
    request = Rack::Attack::Request.new("REMOTE_ADDR" => "10.0.0.5", "HTTP_CF_CONNECTING_IP" => "203.0.113.20", "HTTP_X_FORWARDED_FOR" => "192.0.2.99")
    expect(Stoqo::RateLimit.client_ip(request)).to eq("203.0.113.20")
    request.set_header("HTTP_CF_CONNECTING_IP", "not-an-ip")
    expect(Stoqo::RateLimit.client_ip(request)).to eq("10.0.0.5")
    ENV["RENDER"] = "false"
    request.set_header("HTTP_CF_CONNECTING_IP", "203.0.113.20")
    expect(Stoqo::RateLimit.client_ip(request)).to eq("10.0.0.5")
  ensure
    ENV["RENDER"] = original
  end

  it "does not store raw account addresses or bearer tokens in limiter identities" do
    request = Rack::Attack::Request.new(Rack::MockRequest.env_for("/api/v1/auth/login", method: "POST", input: {email: "OWNER@example.test"}.to_json,
      "CONTENT_TYPE" => "application/json", "HTTP_AUTHORIZATION" => "Bearer #{'a' * 64}"))
    expect(Stoqo::RateLimit.email_key(request)).to eq(Digest::SHA256.hexdigest("owner@example.test"))
    expect(Stoqo::RateLimit.session_key(request)).to match(/\A[a-f0-9]{64}\z/)
    expect(Stoqo::RateLimit.session_key(request)).not_to include("a" * 64)
  end

  it "still parses a real JSON login body and does not revoke an existing session on 429" do
    user = create(:user, password: "strong-password-123")
    post "/api/v1/auth/login", params: {email: user.email.upcase, password: "strong-password-123"}, as: :json
    expect(response).to have_http_status(:ok)
    token = response.parsed_body.dig("data", "token")
    9.times do
      post "/api/v1/auth/login.json/", params: {email: user.email, password: "incorrect"}, as: :json
      expect(response).to have_http_status(:unauthorized)
    end
    expect {
      post "/api/v1/auth/login", params: {email: user.email, password: "strong-password-123"}, as: :json
    }.not_to change(Session, :count)
    expect(response).to have_http_status(:too_many_requests)
    expect(response.headers["Retry-After"].to_i).to be_between(1, 300)
    get "/api/v1/auth/me", headers: {"Authorization" => "Bearer #{token}"}
    expect(response).to have_http_status(:ok)
  end

  it "lets Rails reject malformed JSON without a limiter exception" do
    post "/api/v1/auth/login", params: "{", headers: {"CONTENT_TYPE" => "application/json"}
    expect(response).to have_http_status(:bad_request)
    expect(response.parsed_body.dig("error", "code")).to eq("invalid_request")
  end
end
