module Realtime
  class WorkspaceEvents
    def self.user_stream(user_id) = "stoqo:user:#{user_id}"
    def self.workspace_stream(business_id, user_id) = "stoqo:business:#{business_id}:user:#{user_id}"
    def self.broadcast(business, event)
      business.business_memberships.find_each do |membership|
        ActionCable.server.broadcast(workspace_stream(business.id, membership.user_id), event.merge(business_id: business.id))
      end
    end
  end
end
