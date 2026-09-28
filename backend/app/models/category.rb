class Category < ApplicationRecord
  belongs_to :business
  validates :name, presence: true, uniqueness: {scope: :business_id}, length: {maximum: 100}
end
