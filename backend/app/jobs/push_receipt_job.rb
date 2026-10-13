class PushReceiptJob < ApplicationJob
  retry_on Notifications::ExpoPush::Error, wait: :polynomially_longer, attempts: 5
  discard_on ActiveRecord::RecordNotFound
  def perform(id, attempt = 0)
    delivery = PushDelivery.find(id)
    return unless delivery.status == "submitted" && delivery.ticket_id
    receipt = Notifications::ExpoPush.request("getReceipts", {ids: [delivery.ticket_id]})[delivery.ticket_id]
    unless receipt
      set(wait: 5.minutes).perform_later(id, attempt + 1) if attempt < 3
      return
    end
    code = receipt.dig("details", "error").to_s.first(100)
    delivery.device_registration.update!(enabled: false) if code == "DeviceNotRegistered"
    delivery.update!(status: receipt["status"] == "ok" ? "delivered" : "failed", error_code: code.presence)
  end
end
