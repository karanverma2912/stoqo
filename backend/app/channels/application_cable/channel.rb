module ApplicationCable
  class Channel < ActionCable::Channel::Base
    private
    def authenticated?
      current_user.status == "active" && current_user.sessions.where("expires_at > ?", Time.current).exists?(current_session.id)
    end
  end
end
