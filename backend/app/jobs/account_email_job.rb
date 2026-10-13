require "net/smtp"
class AccountEmailJob < ApplicationJob
  retry_on Net::SMTPError, MailProviders::DeliveryError, SystemCallError, OpenSSL::SSL::SSLError, IOError, Timeout::Error, wait: :polynomially_longer, attempts: 5
  discard_on ActiveRecord::RecordNotFound
  def perform(user_id, purpose, encrypted_token)
    user = User.find(user_id)
    return unless user.status == "active"
    token = EmailDelivery.decrypt(encrypted_token)
    record = AccountToken.find_by(user: user, purpose: purpose, token_digest: Digest::SHA256.hexdigest(token.to_s))
    return unless token && record && !record.consumed_at && record.expires_at > Time.current
    AccountMailer.token(user, purpose, token).deliver_now
  end
end
