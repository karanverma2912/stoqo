class SaleReturnItem < ApplicationRecord
  belongs_to :sale
  belongs_to :sale_return
  belongs_to :sale_item
end
