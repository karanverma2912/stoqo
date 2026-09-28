ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
abort("Production mode!") if Rails.env.production?
require "rspec/rails"
require "factory_bot_rails"
ActiveRecord::Migration.maintain_test_schema!
RSpec.configure do |config|
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.include FactoryBot::Syntax::Methods
end
