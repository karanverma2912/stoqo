class TeamInvitation < ApplicationRecord
  belongs_to :business
  before_validation { self.email = email.to_s.strip.downcase }
  validates :email, format: {with: URI::MailTo::EMAIL_REGEXP}, length: {maximum: 254}
  validates :role, inclusion: {in: %w[staff manager admin]}
  scope :pending, -> { where(accepted_at: nil, revoked_at: nil).where("expires_at > ?", Time.current) }
end
