Rack::Attack.cache.store = if Rails.env.test?
  ActiveSupport::Cache::MemoryStore.new
else
  ActiveSupport::Cache::RedisCacheStore.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
end
Rack::Attack.throttle("auth/ip", limit: 20, period: 60) { |r| r.ip if r.post? && r.path.start_with?("/api/v1/auth/") }
Rack::Attack.throttled_responder = ->(_) { [429, {"content-type" => "application/json"}, ['{"error":{"code":"rate_limited","message":"Too many attempts. Try again shortly."}}']] }
