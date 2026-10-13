class PushNotificationJob < ApplicationJob
  retry_on Notifications::ExpoPush::Error, wait: :polynomially_longer, attempts: 5
  discard_on ActiveRecord::RecordNotFound
  def perform(id)
    delivery = PushDelivery.find(id)
    delivery.with_lock do
      return unless delivery.status == "pending"
      device = delivery.device_registration
      member = delivery.notification.business.business_memberships.find_by(user_id: device.user_id)
      unless device.enabled && device.session.expires_at > Time.current && device.user.status == "active" && member && Notifications::Visibility.allowed?(delivery.notification, member)
        delivery.update!(status: "skipped")
        return
      end
      # Never put private stock, sales or employee details on a lock screen.
      ticket = Notifications::ExpoPush.request("send", {to: device.expo_push_token, sound: "default", title: "Stoqo", body: "You have new activity in your store.", channelId: "store-activity", data: {business_id: delivery.notification.business_id, notification_id: delivery.notification_id, route: "notifications"}})
      if ticket["status"] == "ok"
        delivery.update!(status: "submitted", ticket_id: ticket.fetch("id"))
        PushReceiptJob.set(wait: 2.minutes).perform_later(delivery.id)
      else
        code = ticket.dig("details", "error").to_s.first(100)
        raise Notifications::ExpoPush::Error, "Push provider throttled" if %w[MessageRateExceeded ExpoRateLimitExceeded].include?(code)
        device.update!(enabled: false) if code == "DeviceNotRegistered"
        delivery.update!(status: "failed", error_code: code)
      end
    end
  end
end
