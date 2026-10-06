class SaleReturnItem < ApplicationRecord
  validates :disposition, inclusion: {in: %w[sellable damaged]}
  belongs_to :sale
  belongs_to :sale_return
  belongs_to :sale_item
end
