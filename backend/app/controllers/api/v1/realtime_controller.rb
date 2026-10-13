class Api::V1::RealtimeController < ApplicationController
  def ticket
    data({ticket: SocketTicket.issue!(@session), expires_in: 60})
  end
end
