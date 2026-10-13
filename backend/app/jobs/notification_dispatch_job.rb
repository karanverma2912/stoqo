class NotificationDispatchJob < ApplicationJob
  discard_on ActiveRecord::RecordNotFound
  def perform(notification_id)
    notification = Notification.find(notification_id)
    notification.business.business_memberships.includes(:user).find_each do |membership|
      next unless membership.user.status == "active" && Notifications::Visibility.allowed?(notification, membership)
      ActionCable.server.broadcast(Realtime::WorkspaceEvents.workspace_stream(notification.business_id, membership.user_id), {type: "notification_created", business_id: notification.business_id, notification_id: notification.id})
      membership.user.device_registrations.active.find_each do |device|
        delivery = PushDelivery.create_or_find_by!(notification: notification, device_registration: device)
        PushNotificationJob.perform_later(delivery.id) if delivery.status == "pending"
      end
    end
  end
end
