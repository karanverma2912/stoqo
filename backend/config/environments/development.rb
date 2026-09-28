Rails.application.configure do
  config.enable_reloading = true
  config.eager_load = false
  config.consider_all_requests_local = true
  config.active_storage.service = :local
  config.hosts += ENV.fetch("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
end
