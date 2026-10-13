require "openssl"
module Releases
  class AndroidSigning
    def self.encryptor
      key = Rails.application.key_generator.generate_key("stoqo-android-release-v1", 32)
      ActiveSupport::MessageEncryptor.new(key, cipher: "aes-256-gcm")
    end
    def self.credentials
      row = ReleaseCredential.create_or_find_by!(name: "android-release-v1") do |record|
        rsa = OpenSSL::PKey::RSA.new(3072)
        cert = OpenSSL::X509::Certificate.new
        cert.version = 2
        cert.serial = SecureRandom.random_number(2**128)
        cert.subject = OpenSSL::X509::Name.parse("/CN=Stoqo Android/O=Stoqo/C=IN")
        cert.issuer = cert.subject
        cert.public_key = rsa.public_key
        cert.not_before = 1.day.ago
        cert.not_after = 30.years.from_now
        cert.sign(rsa, OpenSSL::Digest::SHA256.new)
        password = SecureRandom.hex(32)
        archive = OpenSSL::PKCS12.create(password, "stoqo", rsa, cert).to_der
        fingerprint = OpenSSL::Digest::SHA256.hexdigest(cert.to_der).upcase.scan(/../).join(":")
        record.encrypted_payload = encryptor.encrypt_and_sign(JSON.generate({keystore: Base64.strict_encode64(archive), store_type: "PKCS12", alias: "stoqo", password: password, sha256: fingerprint}))
      end
      JSON.parse(encryptor.decrypt_and_verify(row.encrypted_payload))
    end
    def self.metadata = credentials.slice("sha256")
  end
end
