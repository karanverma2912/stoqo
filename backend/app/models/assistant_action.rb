class AssistantAction < ApplicationRecord
  belongs_to :business
  belongs_to :user
  validates :kind, inclusion: {in: %w[stock_change invite_employee create_sale]}
end
