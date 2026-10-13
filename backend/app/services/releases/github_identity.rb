require "jwt"
require "net/http"
module Releases
  class GithubIdentity
    ISSUER = "https://token.actions.githubusercontent.com"
    AUDIENCE = "stoqo-android-build"
    class Unauthorized < StandardError; end
    def self.verify!(token)
      raise Unauthorized if token.to_s.bytesize > 16000 || token.blank?
      _, header = JWT.decode(token, nil, false)
      raise Unauthorized unless header["alg"] == "RS256" && header["kid"].is_a?(String)
      jwks = Rails.cache.fetch("github-oidc-jwks-v1", expires_in: 1.hour) do
        uri = URI("#{ISSUER}/.well-known/jwks")
        response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { |http| http.get(uri.request_uri) }
        raise Unauthorized unless response.is_a?(Net::HTTPSuccess) && response.body.bytesize < 128.kilobytes
        JSON.parse(response.body)
      end
      jwk = jwks.fetch("keys").find { |k| k["kid"] == header["kid"] && k["kty"] == "RSA" }
      raise Unauthorized unless jwk
      key = JWT::JWK.import(jwk).public_key
      claims, = JWT.decode(token, key, true, {algorithm: "RS256", iss: ISSUER, verify_iss: true, aud: AUDIENCE, verify_aud: true, required_claims: %w[exp iat iss aud sub repository repository_id repository_owner_id ref workflow_ref sha run_id], leeway: 10})
      repo = ENV.fetch("RELEASE_GITHUB_REPOSITORY", "karanverma2912/stoqo")
      ref = "refs/heads/main"
      owner_id = ENV.fetch("RELEASE_GITHUB_OWNER_ID", "104730231")
      repo_id = ENV.fetch("RELEASE_GITHUB_REPOSITORY_ID", "1392708542")
      owner, name = repo.split("/", 2)
      subjects = ["repo:#{repo}:ref:#{ref}", "repo:#{owner}@#{owner_id}/#{name}@#{repo_id}:ref:#{ref}"]
      raise Unauthorized unless subjects.include?(claims["sub"])
      raise Unauthorized unless claims["repository"] == repo && claims["repository_id"].to_s == ENV.fetch("RELEASE_GITHUB_REPOSITORY_ID", "1392708542")
      raise Unauthorized unless claims["ref"] == ref && claims["repository_owner_id"].to_s == ENV.fetch("RELEASE_GITHUB_OWNER_ID", "104730231") && claims["workflow_ref"] == "#{repo}/.github/workflows/android.yml@#{ref}"
      raise Unauthorized unless %w[workflow_dispatch push].include?(claims["event_name"]) && claims["iat"].to_i >= 10.minutes.ago.to_i && claims["iat"].to_i <= Time.current.to_i + 10 && claims["exp"].to_i > Time.current.to_i
      raise Unauthorized unless claims["sha"].to_s.match?(/\A[0-9a-f]{40}\z/) && claims["run_id"].to_s.match?(/\A\d+\z/)
      claims
    rescue JWT::DecodeError, KeyError, JSON::ParserError, IOError, Timeout::Error, SocketError
      raise Unauthorized
    end
  end
end
