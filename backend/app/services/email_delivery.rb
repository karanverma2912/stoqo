class EmailDelivery
  def self.configured?
    ENV["MAIL_DELIVERY_ENABLED"] == "true" && ENV["MAIL_FROM"].present? && (ENV["RESEND_API_KEY"].present? || ENV["SMTP_ADDRESS"].present?)
  end

  def self.encrypt(raw)
    encryptor.encrypt_and_sign(raw, purpose: "stoqo-email", expires_in: 7.days)
  end

  def self.decrypt(raw)
    encryptor.decrypt_and_verify(raw, purpose: "stoqo-email")
  end

  def self.encryptor
    key = Rails.application.key_generator.generate_key("stoqo-email-tokens-v1", 32)
    ActiveSupport::MessageEncryptor.new(key, cipher: "aes-256-gcm")
  end

  def self.web_link(path, token)
    origin = ENV.fetch("WEB_URL", "http://localhost:3000").delete_suffix("/")
    uri = URI(origin)
    raise ArgumentError, "Configure a valid website origin" unless %w[http https].include?(uri.scheme) && uri.host && uri.userinfo.nil? && uri.query.nil? && uri.fragment.nil?
    "#{origin}/#{path}#token=#{ERB::Util.url_encode(token)}"
  end
end
