class Notification < ApplicationRecord
  has_many :notification_receipts, dependent: :delete_all
  has_many :push_deliveries, dependent: :delete_all
  after_create_commit -> { NotificationDispatchJob.perform_later(id) }
  belongs_to :business
end
