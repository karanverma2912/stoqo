class AccountToken < ApplicationRecord
  belongs_to :user
  validates :purpose, inclusion: {in: %w[email_verification password_reset]}

  def self.issue!(user, purpose)
    raw = SecureRandom.urlsafe_base64(32)
    user.account_tokens.where(purpose: purpose, consumed_at: nil).update_all(consumed_at: Time.current)
    create!(user: user, purpose: purpose, token_digest: Digest::SHA256.hexdigest(raw), expires_at: (purpose == "password_reset" ? 30.minutes : 24.hours).from_now)
    raw
  end

  def self.consume!(raw, purpose)
    record = find_by!(token_digest: Digest::SHA256.hexdigest(raw.to_s), purpose: purpose)
    record.with_lock do
      raise ArgumentError, "This link has expired or has already been used" if record.consumed_at || record.expires_at <= Time.current || record.user.status != "active"
      yield record.user
      record.update!(consumed_at: Time.current)
    end
  end
end
