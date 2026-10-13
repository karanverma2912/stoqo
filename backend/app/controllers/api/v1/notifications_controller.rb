class Api::V1::NotificationsController < ApplicationController
  def index
    rows, meta = paginated(visible_notifications.order(created_at: :desc))
    reads = NotificationReceipt.where(user: current_user, notification_id: rows.map(&:id)).pluck(:notification_id, :read_at).to_h
    unread = visible_notifications.where.not(id: NotificationReceipt.where(user: current_user).where.not(read_at: nil).select(:notification_id)).count
    data(rows.map { |n| n.as_json.merge("read_at" => reads[n.id]) }, meta: meta.merge(unread: unread))
  end
  def update
    notification = visible_notifications.find(params[:id])
    receipt = NotificationReceipt.create_or_find_by!(notification: notification, user: current_user)
    receipt.update!(read_at: Time.current)
    ActionCable.server.broadcast(Realtime::WorkspaceEvents.workspace_stream(current_business.id, current_user.id), {type: "notification_read", notification_id: notification.id, business_id: current_business.id})
    data(notification.as_json.merge("read_at" => receipt.read_at))
  end
  private
  def visible_notifications
    Notifications::Visibility.scope(current_business, pundit_user)
  end
end
