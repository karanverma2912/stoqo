Rails.application.configure do
  config.action_mailer.delivery_method = Rails.env.production? ? :smtp : :test
  config.action_mailer.raise_delivery_errors = true
  config.action_mailer.smtp_settings = {
    address: ENV.fetch("SMTP_ADDRESS", "localhost"),
    port: ENV.fetch("SMTP_PORT", 587).to_i,
    user_name: ENV["SMTP_USERNAME"], password: ENV["SMTP_PASSWORD"],
    authentication: :plain, enable_starttls_auto: true,
    open_timeout: 5, read_timeout: 15
  }
  config.action_mailer.default_options = {from: ENV.fetch("MAIL_FROM", "Stoqo <no-reply@example.invalid>")}
end
