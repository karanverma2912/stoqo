require Rails.root.join("lib/stoqo/rate_limit")

# The free pilot runs one Puma process. Use a dedicated Redis database before
# adding processes/instances; MemoryStore counters are local and reset on restart.
redis_url = ENV["RATE_LIMIT_REDIS_URL"].presence || ENV["REDIS_URL"].presence
Rack::Attack.cache.store = if !Rails.env.test? && redis_url
  ActiveSupport::Cache::RedisCacheStore.new(url: redis_url, namespace: "stoqo:rate-limit")
else
  ActiveSupport::Cache::MemoryStore.new(size: 8.megabytes)
end

Rack::Attack.throttle("api/ip", limit: 600, period: 60) do |request|
  Stoqo::RateLimit.client_ip(request) if Stoqo::RateLimit.api?(request)
end
Rack::Attack.throttle("auth/ip", limit: 20, period: 60) do |request|
  Stoqo::RateLimit.client_ip(request) if request.post? && Stoqo::RateLimit.path(request).start_with?("/api/v1/auth/")
end
Rack::Attack.throttle("signup/ip", limit: 5, period: 600) do |request|
  Stoqo::RateLimit.client_ip(request) if request.post? && Stoqo::RateLimit.path(request) == "/api/v1/auth/signup"
end
Rack::Attack.throttle("login/account", limit: 10, period: 300) do |request|
  Stoqo::RateLimit.email_key(request) if request.post? && Stoqo::RateLimit.path(request) == "/api/v1/auth/login"
end
Rack::Attack.throttle("recovery/ip", limit: 10, period: 600) do |request|
  Stoqo::RateLimit.client_ip(request) if Stoqo::RateLimit.recovery?(request)
end
Rack::Attack.throttle("recovery/account", limit: 3, period: 600) do |request|
  Stoqo::RateLimit.email_key(request) if request.post? && Stoqo::RateLimit.path(request) == "/api/v1/auth/forgot_password"
end
Rack::Attack.throttle("api/session", limit: 240, period: 60) do |request|
  Stoqo::RateLimit.session_key(request) if Stoqo::RateLimit.api?(request)
end
Rack::Attack.throttle("writes/session", limit: 90, period: 60) do |request|
  Stoqo::RateLimit.session_key(request) if Stoqo::RateLimit.api?(request) && !request.get? && !request.head?
end
Rack::Attack.throttle("assistant/session", limit: 8, period: 60) do |request|
  Stoqo::RateLimit.session_key(request) if request.post? && Stoqo::RateLimit.path(request) == "/api/v1/assistant/messages"
end
Rack::Attack.throttle("release/ip", limit: 10, period: 60) do |request|
  Stoqo::RateLimit.client_ip(request) if request.post? && Stoqo::RateLimit.path(request) == "/api/v1/releases/android_credentials"
end
Rack::Attack.throttled_responder = Stoqo::RateLimit.method(:respond)
