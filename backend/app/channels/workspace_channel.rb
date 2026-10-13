class WorkspaceChannel < ApplicationCable::Channel
  def subscribed
    @business_id = Integer(params[:business_id].to_s, 10)
    reject unless authenticated? && current_user.business_memberships.exists?(business_id: @business_id)
    return if subscription_rejected?
    stream_from Realtime::WorkspaceEvents.workspace_stream(@business_id, current_user.id), coder: ActiveSupport::JSON do |message|
      if authenticated? && current_user.business_memberships.exists?(business_id: @business_id)
        transmit(message)
      else
        stop_all_streams
      end
    end
  rescue ArgumentError
    reject
  end
end
