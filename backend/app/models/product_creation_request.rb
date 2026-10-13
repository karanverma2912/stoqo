class ProductCreationRequest < ApplicationRecord
  belongs_to :business
  belongs_to :user
  belongs_to :product
end
