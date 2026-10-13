require "rails_helper"
require "stringio"
RSpec.describe "Persistent mobile files and email delivery" do
  it "persists binary uploads with checksums and enforces the shared quota" do
    service = ActiveStorage::Service::DatabaseService.new
    bytes = "\x00\xFFdata".b
    service.upload("binary-test", StringIO.new(bytes), checksum: Digest::MD5.base64digest(bytes))
    expect(service.download("binary-test")).to eq(bytes)
    expect(service.download_chunk("binary-test", 0..1)).to eq(bytes.byteslice(0..1))
    expect { service.upload("bad-checksum", StringIO.new(bytes), checksum: "wrong") }.to raise_error(ActiveStorage::IntegrityError)
    old = ENV["UPLOAD_DATABASE_LIMIT_BYTES"]
    begin
      ENV["UPLOAD_DATABASE_LIMIT_BYTES"] = bytes.bytesize.to_s
      expect { service.upload("extra-file", StringIO.new("extra")) }.to raise_error(ActiveStorage::IntegrityError, /capacity/)
    ensure
      old ? ENV["UPLOAD_DATABASE_LIMIT_BYTES"] = old : ENV.delete("UPLOAD_DATABASE_LIMIT_BYTES")
    end
    service.delete("binary-test")
    expect { service.download("binary-test") }.to raise_error(ActiveStorage::FileNotFoundError)
  end
  it "sends the invited email a token link once and skips revoked invitations" do
    business = create(:business)
    raw = SecureRandom.urlsafe_base64(32)
    invitation = TeamInvitation.create!(business: business, email: "invited@example.test", role: "manager", token_digest: Digest::SHA256.hexdigest(raw), expires_at: 7.days.from_now)
    allow(EmailDelivery).to receive(:web_link).and_return("https://stoqo.example/join#token=#{raw}")
    ActionMailer::Base.deliveries.clear
    encrypted = EmailDelivery.encrypt(raw)
    2.times { InvitationEmailJob.perform_now(invitation.id, encrypted) }
    expect(ActionMailer::Base.deliveries.length).to eq(1)
    mail = ActionMailer::Base.deliveries.first
    expect(mail.to).to eq(["invited@example.test"])
    expect(mail.body.to_s).to include(raw)
    expect(invitation.reload.email_status).to eq("sent")
    invitation.update!(email_sent_at: nil, revoked_at: Time.current)
    InvitationEmailJob.perform_now(invitation.id, encrypted)
    expect(ActionMailer::Base.deliveries.length).to eq(1)
  end
end
