require "net/http"
module Assistant
  class Gemini
    def self.configured? = ENV["GEMINI_API_KEY"].present? && ENV["AI_ENABLED"] == "true"
    def self.generate(contents:, declarations:, system:)
      raise Unavailable, "The AI assistant needs a Gemini API key configured by the Stoqo operator." unless configured?
      model = ENV.fetch("GEMINI_MODEL", "gemini-3.5-flash-lite")
      raise Unavailable, "Invalid AI model configuration" unless model.match?(/\Agemini-[a-zA-Z0-9.-]+\z/)
      uri = URI("https://generativelanguage.googleapis.com/v1beta/models/#{model}:generateContent")
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request["x-goog-api-key"] = ENV.fetch("GEMINI_API_KEY")
      request.body = JSON.generate({systemInstruction: {parts: [{text: system}]}, contents: contents, tools: [{functionDeclarations: declarations}], generationConfig: {temperature: 0.2, maxOutputTokens: 1400}, toolConfig: {functionCallingConfig: {mode: "AUTO"}}})
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 20) { |http| http.request(request) }
      raise Unavailable, "The AI quota is temporarily exhausted. Your inventory is still available." if response.code == "429"
      raise Unavailable, "The AI provider is unavailable. Try again shortly." unless response.is_a?(Net::HTTPSuccess) && response.body.bytesize < 512.kilobytes
      result = JSON.parse(response.body)
      parts = result.dig("candidates", 0, "content", "parts")
      raise Unavailable, "The assistant could not answer this request. Try a shorter question." unless parts.is_a?(Array) && parts.any?
      parts
    rescue JSON::ParserError, IOError, Timeout::Error, SocketError => error
      raise Unavailable, "The AI provider is unavailable (#{error.class.name})."
    end
  end
end
