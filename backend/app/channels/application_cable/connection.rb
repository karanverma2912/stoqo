module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user, :current_session
    def connect
      self.current_session = SocketTicket.redeem!(request.params[:ticket])
      reject_unauthorized_connection unless current_session
      self.current_user = current_session.user
    end
    protected
    def allow_request_origin?
      # Native WebSockets have no browser Origin; the short-lived one-use ticket authenticates them.
      request.origin.blank? || super
    end
  end
end
