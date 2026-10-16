require "digest"
require "ipaddr"

module Stoqo
  module RateLimit
    RECOVERY_PATHS = %w[/api/v1/auth/forgot_password /api/v1/auth/reset_password /api/v1/auth/verify_email /api/v1/auth/request_verification].freeze

    def self.path(request)
      # Rails accepts trailing slashes and an optional format suffix. They must
      # consume the same quota as the unformatted route.
      request.path.squeeze("/").sub(%r{/+\z}, "").sub(%r{\.[^/]+\z}, "")
    end

    def self.api?(request)
      path(request).start_with?("/api/v1/") && !request.options?
    end

    def self.recovery?(request)
      request.post? && RECOVERY_PATHS.include?(path(request))
    end

    def self.client_ip(request)
      # Only Render's public ingress is trusted to set this header. Outside
      # Render, use the socket address: arbitrary X-Forwarded-For is spoofable.
      candidate = request.get_header("HTTP_CF_CONNECTING_IP") if ENV["RENDER"] == "true"
      IPAddr.new(candidate.presence || request.get_header("REMOTE_ADDR").to_s).to_s
    rescue IPAddr::InvalidAddressError
      request.get_header("REMOTE_ADDR").to_s
    end

    def self.session_key(request)
      authorization = request.get_header("HTTP_AUTHORIZATION").to_s
      Digest::SHA256.hexdigest(authorization) if authorization.match?(/\ABearer [A-Za-z0-9_-]{64}\z/)
    end

    def self.email_key(request)
      # Rack does not parse JSON; use Rails' parser and its shared request cache
      # so downstream authentication receives the original body unchanged.
      email = ActionDispatch::Request.new(request.env).parameters["email"]
      Digest::SHA256.hexdigest(email.strip.downcase) if email.is_a?(String) && email.present?
    rescue ActionDispatch::Http::Parameters::ParseError, ActionController::BadRequest
      nil # Let Rails return its normal invalid-body response.
    end

    def self.respond(request)
      match = request.env.fetch("rack.attack.match_data")
      now = match.fetch(:epoch_time)
      retry_after = match.fetch(:period) - now % match.fetch(:period)
      headers = {
        "content-type" => "application/json",
        "cache-control" => "no-store",
        "retry-after" => retry_after.to_s,
        "ratelimit-limit" => match.fetch(:limit).to_s,
        "ratelimit-remaining" => "0",
        "ratelimit-reset" => (now + retry_after).to_s
      }
      body = {error: {code: "rate_limited", message: "Too many requests. Please wait #{retry_after} seconds and try again.", details: {}, retry_after: retry_after}}
      [429, headers, [JSON.generate(body)]]
    end
  end
end
