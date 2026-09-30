class ProductGroup < ApplicationRecord
  belongs_to :business
  has_many :products
  before_validation { self.name = name.to_s.strip }
  validates :name, presence: true, length: {maximum: 200}
end
