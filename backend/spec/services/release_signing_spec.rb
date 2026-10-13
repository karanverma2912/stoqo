require "rails_helper"
require "webmock/rspec"

RSpec.describe "Release signing" do
  let(:rsa) { OpenSSL::PKey::RSA.new(2048) }
  let(:claims) { {"iss" => Releases::GithubIdentity::ISSUER, "aud" => Releases::GithubIdentity::AUDIENCE, "sub" => "repo:karanverma2912@104730231/stoqo@1392708542:ref:refs/heads/main", "repository" => "karanverma2912/stoqo", "repository_id" => "1392708542", "repository_owner_id" => "104730231", "ref" => "refs/heads/main", "workflow_ref" => "karanverma2912/stoqo/.github/workflows/android.yml@refs/heads/main", "sha" => "a" * 40, "run_id" => "12345", "event_name" => "workflow_dispatch", "iat" => Time.current.to_i, "exp" => 5.minutes.from_now.to_i} }
  before do
    Rails.cache.delete("github-oidc-jwks-v1")
    jwk = JWT::JWK.new(rsa.public_key, "test-key").export
    stub_request(:get, "#{Releases::GithubIdentity::ISSUER}/.well-known/jwks").to_return(body: {keys: [jwk]}.to_json)
  end
  def token(values) = JWT.encode(values, rsa, "RS256", {kid: "test-key"})

  it "accepts only a signed identity from this repository's main release workflow" do
    expect(Releases::GithubIdentity.verify!(token(claims)).fetch("run_id")).to eq("12345")
    [{"repository_id" => "other"}, {"ref" => "refs/heads/untrusted"}, {"aud" => "different"}, {"exp" => 1.minute.ago.to_i}, {"workflow_ref" => "karanverma2912/stoqo/.github/workflows/other.yml@refs/heads/main"}].each do |change|
      expect { Releases::GithubIdentity.verify!(token(claims.merge(change))) }.to raise_error(Releases::GithubIdentity::Unauthorized)
    end
  end

  it "creates a stable encrypted signing key that never appears in public metadata" do
    first = Releases::AndroidSigning.credentials
    second = Releases::AndroidSigning.credentials
    expect(second).to eq(first)
    record = ReleaseCredential.last
    expect(record.encrypted_payload).not_to include(first.fetch("password"))
    bundle = OpenSSL::PKCS12.new(Base64.strict_decode64(first.fetch("keystore")), first.fetch("password"))
    expect(bundle.key.private?).to eq(true)
    expect(Releases::AndroidSigning.metadata.keys).to eq(["sha256"])
  end
end
