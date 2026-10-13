class TeamMailer < ApplicationMailer
  def invitation(invitation, raw_token)
    link = EmailDelivery.web_link("join", raw_token)
    mail(to: invitation.email, subject: "Join #{invitation.business.name} on Stoqo", body: "You have been invited to #{invitation.business.name} as #{invitation.role}.\n\nOpen this link and sign in or create an account with #{invitation.email}:\n#{link}\n\nYour invitation expires in 7 days. Once you accept, you can start working immediately.\n\nIf you did not expect this invitation, ignore this email.", content_type: "text/plain")
  end
end
