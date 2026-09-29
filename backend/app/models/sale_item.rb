class SaleItem < ApplicationRecord
  belongs_to :sale
  belongs_to :business
  belongs_to :product
end
