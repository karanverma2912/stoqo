class DeviceRegistration < ApplicationRecord
  belongs_to :user
  belongs_to :session
  has_many :push_deliveries, dependent: :delete_all
  validates :installation_id, format: {with: /\A[a-zA-Z0-9_-]{16,100}\z/}
  validates :expo_push_token, format: {with: /\A(?:ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_-]+\]\z/}
  validates :platform, inclusion: {in: %w[android ios]}
  scope :active, -> { where(enabled: true).joins(:session).where("sessions.expires_at > ?", Time.current) }
end
