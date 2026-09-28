require_relative "boot"
require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "active_storage/engine"
require "action_controller/railtie"
Bundler.require(*Rails.groups)
module Stoqo
  class Application < Rails::Application
    config.load_defaults 8.1
    config.api_only = true
    config.active_storage.draw_routes = false
    config.active_job.queue_adapter = :sidekiq
    config.active_record.default_timezone = :utc
    config.filter_parameters += [:password, :password_confirmation, :token, :authorization]
    config.middleware.use Rack::Attack
    config.autoload_lib(ignore: %w[assets tasks])
  end
end
