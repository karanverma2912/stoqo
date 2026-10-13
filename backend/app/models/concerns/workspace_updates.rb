module WorkspaceUpdates
  extend ActiveSupport::Concern
  included do
    after_commit :publish_workspace_change
  end
  private
  def publish_workspace_change
    WorkspaceChangedJob.perform_later(business_id, self.class.name.underscore)
  end
end
