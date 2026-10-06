class Supplier < ApplicationRecord
  belongs_to :business
  has_many :products
  before_validation { self.name = name.to_s.strip }
  validates :name, presence: true, length: {maximum: 120}
  validates :contact_name, length: {maximum: 120}
  validates :phone, length: {maximum: 30}
  validates :email, length: {maximum: 254}, format: {with: URI::MailTo::EMAIL_REGEXP}, allow_blank: true
  validates :notes, length: {maximum: 2000}
end
