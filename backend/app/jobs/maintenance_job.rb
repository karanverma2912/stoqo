class MaintenanceJob < ApplicationJob
  def perform
    EmailSendBudget.where("created_at < ?", 40.days.ago).delete_all
    SocketTicket.where("expires_at < ?", 1.day.ago).delete_all
    AccountToken.where("expires_at < ?", 7.days.ago).delete_all
    AssistantAction.where("expires_at < ?", 30.days.ago).delete_all
    AiDailyBudget.where("day < ?", 30.days.ago.to_date).delete_all
  end
end
