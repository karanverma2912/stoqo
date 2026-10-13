class BusinessMembership < ApplicationRecord
  include WorkspaceUpdates
  after_commit -> { ActionCable.server.broadcast(Realtime::WorkspaceEvents.user_stream(user_id), {type: "membership_changed", business_id: business_id}) }
  belongs_to :business
  belongs_to :user
  validates :role, inclusion: {in: %w[owner admin manager staff]}
  validates :user_id, uniqueness: {scope: :business_id}
end
