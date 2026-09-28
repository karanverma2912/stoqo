class Import < ApplicationRecord
  belongs_to :business
  belongs_to :user
  has_one_attached :file
end
