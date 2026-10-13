require "net/smtp"
class InvitationEmailJob < ApplicationJob
  retry_on Net::SMTPError, MailProviders::DeliveryError, SystemCallError, OpenSSL::SSL::SSLError, IOError, Timeout::Error, wait: :polynomially_longer, attempts: 5 do |job, _error|
    TeamInvitation.where(id: job.arguments.first, accepted_at: nil, revoked_at: nil, email_sent_at: nil).update_all(email_status: "failed")
  end
  discard_on ActiveRecord::RecordNotFound
  def perform(id, encrypted_token)
    invitation = TeamInvitation.find(id)
    return if invitation.accepted_at || invitation.revoked_at || invitation.expires_at <= Time.current || invitation.email_sent_at
    token = EmailDelivery.decrypt(encrypted_token)
    return unless token && ActiveSupport::SecurityUtils.secure_compare(Digest::SHA256.hexdigest(token), invitation.token_digest)
    TeamMailer.invitation(invitation, token).deliver_now
    invitation.update!(email_status: "sent", email_sent_at: Time.current)
  rescue Net::SMTPError, MailProviders::DeliveryError, SystemCallError, OpenSSL::SSL::SSLError, IOError, Timeout::Error
    invitation&.update!(email_status: "retrying")
    raise
  end
end
