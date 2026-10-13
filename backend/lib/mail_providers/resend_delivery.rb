require "net/http"
module MailProviders
  class DeliveryError < StandardError; end
  class ResendDelivery
    def initialize(*) = nil
    def deliver!(message)
      raise DeliveryError, "Email provider is not configured" unless ENV["RESEND_API_KEY"].present?
      payload = {from: message[:from].to_s, to: message.to, subject: message.subject, text: message.body.decoded}
      raise DeliveryError, "Only single-recipient service emails are supported" unless message.to.size == 1 && message.cc.blank? && message.bcc.blank?
      digest = Digest::SHA256.hexdigest(JSON.generate(payload))
      EmailSendBudget.reserve!(digest)
      uri = URI("https://api.resend.com/emails")
      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "Bearer #{ENV.fetch('RESEND_API_KEY')}"
      request["Content-Type"] = "application/json"
      request["Idempotency-Key"] = "stoqo-#{digest}"
      request.body = JSON.generate(payload)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 15) { |http| http.request(request) }
      raise DeliveryError, "Email delivery unavailable (#{response.code})" unless response.is_a?(Net::HTTPSuccess)
    rescue IOError, Timeout::Error, SocketError, OpenSSL::SSL::SSLError
      raise DeliveryError, "Could not reach the email provider"
    end
  end
end
