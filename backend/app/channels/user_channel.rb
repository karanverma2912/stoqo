class UserChannel < ApplicationCable::Channel
  def subscribed
    reject unless authenticated?
    return if subscription_rejected?
    stream_from Realtime::WorkspaceEvents.user_stream(current_user.id), coder: ActiveSupport::JSON do |message|
      authenticated? ? transmit(message) : stop_all_streams
    end
  end
end
