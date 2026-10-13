class WorkspaceChangedJob < ApplicationJob
  discard_on ActiveRecord::RecordNotFound
  def perform(business_id, resource)
    Realtime::WorkspaceEvents.broadcast(Business.find(business_id), {type: "workspace_changed", resource: resource})
  end
end
