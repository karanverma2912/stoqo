Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false
  config.force_ssl = true
  config.assume_ssl = true
  config.log_level = :info
  config.logger = ActiveSupport::Logger.new(STDOUT)
  config.active_storage.service = :s3
  config.hosts = ENV.fetch("ALLOWED_HOSTS", "localhost").split(",") + [ENV["RENDER_EXTERNAL_HOSTNAME"], ENV["RENDER_INTERNAL_HOSTNAME"]].compact
  config.host_authorization = {exclude: ->(request) { request.path == "/up" }}
  config.ssl_options = {redirect: {exclude: ->(request) { request.path == "/up" }}}
  config.secret_key_base = ENV.fetch("SECRET_KEY_BASE")
end
