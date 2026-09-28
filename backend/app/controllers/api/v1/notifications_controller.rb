class Api::V1::NotificationsController < ApplicationController
  def index
    rows, meta = paginated(current_business.notifications.order(created_at: :desc))
    data(rows, meta: meta)
  end
  def update
    notification = current_business.notifications.find(params[:id])
    notification.update!(read_at: Time.current)
    data(notification)
  end
end
