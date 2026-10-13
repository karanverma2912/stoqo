class Api::V1::AssistantController < ApplicationController
  rescue_from Assistant::Unavailable do |error|
    self.error("assistant_unavailable", error.message, :service_unavailable)
  end
  def capabilities
    data({configured: Assistant::Gemini.configured?, enabled: current_business.ai_enabled?, email_delivery_available: EmailDelivery.configured?, help: Assistant::Tools::HELP, confirmation_required: true, daily_call_limit: ENV.fetch("AI_DAILY_CALL_LIMIT", 50).to_i, tools: Assistant::Tools.new(business: current_business, user: current_user).declarations.map { |d| d[:name] }})
  end
  def messages
    data(Assistant::Chat.call(business: current_business, user: current_user, message: params.require(:message), language: params[:language]))
  end
  def confirm
    action = current_business.assistant_actions.where(user: current_user).find(params[:id])
    data(Assistant::ConfirmAction.call(action: action, user: current_user))
  end
  def cancel
    action = current_business.assistant_actions.where(user: current_user).find(params[:id])
    action.with_lock do
      raise ArgumentError, "This task is already completed" if action.status == "completed"
      action.update!(status: "cancelled")
    end
    data({cancelled: true})
  end
end
