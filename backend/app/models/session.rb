class Session < ApplicationRecord
  belongs_to :user
  def self.issue!(user)
    token = SecureRandom.urlsafe_base64(48)
    create!(user: user, token_digest: Digest::SHA256.hexdigest(token), expires_at: 14.days.from_now)
    token
  end
end
