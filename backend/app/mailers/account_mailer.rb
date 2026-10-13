class AccountMailer < ApplicationMailer
  def token(user, purpose, raw_token)
    verification = purpose == "email_verification"
    link = EmailDelivery.web_link(verification ? "verify" : "reset-password", raw_token)
    mail(to: user.email, subject: verification ? "Verify your Stoqo email" : "Reset your Stoqo password", body: "#{verification ? 'Verify your email to finish setting up Stoqo.' : 'Use this link to choose a new Stoqo password.'}\n\n#{link}\n\nThis link can be used once and expires #{verification ? 'in 24 hours' : 'in 30 minutes'}. If you did not request it, ignore this email.", content_type: "text/plain")
  end
end
