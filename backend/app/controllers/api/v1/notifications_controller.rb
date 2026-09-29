class Api::V1::NotificationsController < ApplicationController
  def index
    rows, meta = paginated(visible_notifications.order(created_at: :desc))
    data(rows, meta: meta)
  end
  def update
    notification = visible_notifications.find(params[:id])
    notification.update!(read_at: Time.current)
    data(notification)
  end
  private
  def visible_notifications
    scope = current_business.notifications
    BusinessPolicy.new(pundit_user, current_business).report? ? scope : scope.where.not(kind: "sale_completed")
  end
end
