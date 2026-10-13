class ApplicationMailer < ActionMailer::Base
  default from: -> { ENV.fetch("MAIL_FROM", "Stoqo <no-reply@example.invalid>") }
end
