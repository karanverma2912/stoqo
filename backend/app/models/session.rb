class Session < ApplicationRecord
  has_many :device_registrations, dependent: :destroy
  has_many :socket_tickets, dependent: :delete_all
  belongs_to :user
  def self.issue!(user)
    token = SecureRandom.urlsafe_base64(48)
    create!(user: user, token_digest: Digest::SHA256.hexdigest(token), expires_at: 14.days.from_now)
    token
  end
end
