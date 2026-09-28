class User < ApplicationRecord
  has_secure_password
  has_many :business_memberships
  has_many :businesses, through: :business_memberships
  has_many :sessions, dependent: :destroy
  normalizes :email, with: ->(email) { email.strip.downcase }
  validates :name, presence: true, length: {maximum: 100}
  validates :email, presence: true, uniqueness: {case_sensitive: false}, format: {with: URI::MailTo::EMAIL_REGEXP}
  validates :password, length: {minimum: 12, maximum: 72}, if: -> { new_record? || password.present? }
end
