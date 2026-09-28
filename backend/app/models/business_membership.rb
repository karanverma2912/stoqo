class BusinessMembership < ApplicationRecord
  belongs_to :business
  belongs_to :user
  validates :role, inclusion: {in: %w[owner admin manager staff]}
  validates :user_id, uniqueness: {scope: :business_id}
end
