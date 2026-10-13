class EmailSendBudget < ApplicationRecord
  def self.reserve!(digest)
    transaction do
      connection.execute("SELECT pg_advisory_xact_lock(746072)")
      return if exists?(request_digest: digest)
      daily = ENV.fetch("EMAIL_DAILY_LIMIT", 80).to_i.clamp(0, 80)
      monthly = ENV.fetch("EMAIL_MONTHLY_LIMIT", 2000).to_i.clamp(0, 2000)
      raise MailProviders::DeliveryError, "Daily email limit reached" if where("created_at >= ?", Time.current.beginning_of_day).count >= daily
      raise MailProviders::DeliveryError, "Monthly email limit reached" if where("created_at >= ?", Time.current.beginning_of_month).count >= monthly
      create!(request_digest: digest)
    end
  end
end
