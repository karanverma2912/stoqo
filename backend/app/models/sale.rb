class Sale < ApplicationRecord
  before_validation { self.customer_phone_normalized = customer_phone.to_s.gsub(/[^0-9]/, "").presence }
  belongs_to :business
  belongs_to :user
  has_many :sale_items
  has_many :sale_returns
  validates :customer_name, length: {maximum: 120}
  validates :customer_phone, length: {maximum: 30}
  validates :idempotency_key, presence: true, length: {maximum: 80}
  validates :payment_method, inclusion: {in: %w[cash upi card other]}
  validates :status, inclusion: {in: %w[completed partially_returned returned]}
end
