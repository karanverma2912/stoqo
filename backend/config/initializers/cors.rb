Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*ENV.fetch("FRONTEND_ORIGINS", "http://localhost:3000").split(","))
    resource "/api/*", headers: :any, methods: [:get, :post, :patch, :delete, :options], expose: ["Content-Disposition"]
  end
end
