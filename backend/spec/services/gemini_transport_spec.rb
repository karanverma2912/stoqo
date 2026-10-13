require "rails_helper"
require "webmock/rspec"
RSpec.describe Assistant::Gemini do
  around do |example|
    previous = ENV.to_h.slice("GEMINI_API_KEY", "AI_ENABLED", "GEMINI_MODEL")
    ENV["AI_ENABLED"] = "true"; ENV["GEMINI_API_KEY"] = "test-server-key"; ENV["GEMINI_MODEL"] = "gemini-3.5-flash-lite"
    example.run
  ensure
    %w[GEMINI_API_KEY AI_ENABLED GEMINI_MODEL].each { |key| previous.key?(key) ? ENV[key] = previous[key] : ENV.delete(key) }
  end
  let(:url) { "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent" }
  it "keeps the key in the server header and preserves tool signatures" do
    parts = [{"functionCall" => {"name" => "stock_summary", "args" => {}}, "thoughtSignature" => "provider-signature"}]
    stub_request(:post, url).with(headers: {"X-Goog-Api-Key" => "test-server-key"}, body: ->(raw) { !raw.include?("test-server-key") }).to_return(status: 200, body: {candidates: [{content: {parts: parts}}]}.to_json)
    expect(described_class.generate(contents: [], declarations: [], system: "Test")).to eq(parts)
  end
  it "stops on quota errors without a billable fallback" do
    stub_request(:post, url).to_return(status: 429, body: "{}")
    expect { described_class.generate(contents: [], declarations: [], system: "Test") }.to raise_error(Assistant::Unavailable, /quota/)
    expect(a_request(:post, url)).to have_been_made.once
  end
end
