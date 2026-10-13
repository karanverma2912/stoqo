require "rails_helper"
require "webmock/rspec"
RSpec.describe MailProviders::ResendDelivery do
  around do |example|
    old_key, old_limit = ENV.values_at("RESEND_API_KEY", "EMAIL_DAILY_LIMIT")
    ENV["RESEND_API_KEY"] = "test-server-email-key"
    ENV["EMAIL_DAILY_LIMIT"] = "1"
    example.run
  ensure
    old_key ? ENV["RESEND_API_KEY"] = old_key : ENV.delete("RESEND_API_KEY")
    old_limit ? ENV["EMAIL_DAILY_LIMIT"] = old_limit : ENV.delete("EMAIL_DAILY_LIMIT")
  end
  it "retries the same email with one budget reservation and stops new emails at the limit" do
    ids = []
    stub_request(:post, "https://api.resend.com/emails").with(headers: {"Authorization" => "Bearer test-server-email-key"}).to_return do |request|
      ids << request.headers["Idempotency-Key"]
      {status: 200, body: '{"id":"email-test"}'}
    end
    delivery = described_class.new
    message = Mail.new(from: "Stoqo <team@stoqo.example>", to: "invited@example.test", subject: "Invitation", body: "Token link")
    2.times { delivery.deliver!(message) }
    expect(ids.uniq.size).to eq(1)
    expect(EmailSendBudget.count).to eq(1)
    message.subject = "Another invitation"
    expect { delivery.deliver!(message) }.to raise_error(MailProviders::DeliveryError, /Daily/)
    expect(a_request(:post, "https://api.resend.com/emails")).to have_been_made.twice
  end
end
