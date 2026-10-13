class SocketTicket < ApplicationRecord
  belongs_to :session

  def self.issue!(session)
    token = SecureRandom.urlsafe_base64(32)
    create!(session: session, token_digest: Digest::SHA256.hexdigest(token), expires_at: 60.seconds.from_now)
    token
  end

  def self.redeem!(raw)
    ticket = find_by(token_digest: Digest::SHA256.hexdigest(raw.to_s))
    return unless ticket
    ticket.with_lock do
      return if ticket.consumed_at || ticket.expires_at <= Time.current
      session = ticket.session
      return unless session.expires_at > Time.current && session.user.status == "active"
      ticket.update!(consumed_at: Time.current)
      session
    end
  end
end
