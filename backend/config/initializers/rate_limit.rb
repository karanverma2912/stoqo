Rack::Attack.cache.store = if Rails.env.test?
  ActiveSupport::Cache::MemoryStore.new
elsif ENV["REDIS_URL"].present?
  ActiveSupport::Cache::RedisCacheStore.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
else
  ActiveSupport::Cache::MemoryStore.new
end
Rack::Attack.throttle("auth/ip", limit: 20, period: 60) { |r| r.ip if r.post? && r.path.start_with?("/api/v1/auth/") }
Rack::Attack.throttle("assistant/session", limit: 8, period: 60) do |request|
  Digest::SHA256.hexdigest(request.get_header("HTTP_AUTHORIZATION").to_s) if request.post? && request.path == "/api/v1/assistant/messages"
end
Rack::Attack.throttle("release/ip", limit: 10, period: 60) { |request| request.ip if request.path == "/api/v1/releases/android_credentials" }
Rack::Attack.throttled_responder = ->(_) { [429, {"content-type" => "application/json"}, ['{"error":{"code":"rate_limited","message":"Too many attempts. Try again shortly."}}']] }
