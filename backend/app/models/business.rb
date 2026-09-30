class Business < ApplicationRecord
  belongs_to :subscription_plan
  has_many :business_memberships
  has_many :sales
  has_many :sale_returns
  has_many :product_groups
  has_many :product_setup_batches
  has_many :products
  has_many :categories
  has_many :stock_movements
  has_many :activities
  has_many :notifications
  has_many :team_invitations
  has_many :subscription_requests
  has_many :imports
  validates :name, presence: true, length: {maximum: 120}
  validates :currency, format: {with: /\A[A-Z]{3}\z/}
  validates :timezone, inclusion: {in: ActiveSupport::TimeZone.all.map(&:tzinfo).map(&:name)}
  def subscription_state
    return trial_ends_at > Time.current ? "trial" : "expired" if subscription_status == "trial"
    return subscription_ends_at.nil? || subscription_ends_at > Time.current ? "active" : "expired" if subscription_status == "active"
    subscription_status
  end
  def writable?
    %w[trial active].include?(subscription_state)
  end
end
