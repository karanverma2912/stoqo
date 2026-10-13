class AiDailyBudget < ApplicationRecord
  belongs_to :business
  def self.reserve!(business)
    budget = create_or_find_by!(business: business, day: Time.current.utc.to_date)
    budget.with_lock do
      raise Assistant::Unavailable, "The store's daily AI limit has been reached. Try again tomorrow." if budget.calls >= ENV.fetch("AI_DAILY_CALL_LIMIT", 50).to_i.clamp(0, 1000)
      budget.increment!(:calls)
    end
  end
end
