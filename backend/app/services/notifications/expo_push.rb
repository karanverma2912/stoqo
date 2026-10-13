require "net/http"
module Notifications
  class ExpoPush
    class Error < StandardError; end
    def self.request(path, body)
      uri = URI("https://exp.host/--/api/v2/push/#{path}")
      req = Net::HTTP::Post.new(uri)
      req["Content-Type"] = "application/json"
      req["Authorization"] = "Bearer #{ENV['EXPO_ACCESS_TOKEN']}" if ENV["EXPO_ACCESS_TOKEN"].present?
      req.body = JSON.generate(body)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { |http| http.request(req) }
      raise Error, "Push provider unavailable" unless response.is_a?(Net::HTTPSuccess)
      JSON.parse(response.body).fetch("data")
    rescue JSON::ParserError, KeyError, IOError, Timeout::Error, SocketError => error
      raise Error, "Push provider unavailable (#{error.class.name})"
    end
  end
end
