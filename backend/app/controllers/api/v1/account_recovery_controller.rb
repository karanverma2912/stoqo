class Api::V1::AccountRecoveryController < ApplicationController
  skip_before_action :authenticate!, only: [:forgot_password, :reset_password, :verify_email]
  def forgot_password
    user = User.find_by(email: params[:email].to_s.strip.downcase, status: "active")
    if EmailDelivery.configured? && user
      raw = AccountToken.issue!(user, "password_reset")
      AccountEmailJob.perform_later(user.id, "password_reset", EmailDelivery.encrypt(raw))
    end
    data({message: EmailDelivery.configured? ? "If this email has an account, a password reset link will be sent." : "Password recovery email is currently unavailable. Please contact Stoqo support.", email_delivery_available: EmailDelivery.configured?}, status: :accepted)
  end
  def reset_password
    AccountToken.consume!(params.require(:token), "password_reset") do |user|
      user.update!(password: params.require(:password), password_confirmation: params.require(:password_confirmation))
      user.sessions.destroy_all
    end
    data({message: "Password reset. Sign in with your new password."})
  end
  def verify_email
    AccountToken.consume!(params.require(:token), "email_verification") { |user| user.update!(email_verified_at: Time.current) }
    data({message: "Email verified. You can continue in Stoqo."})
  end
  def request_verification
    raise ArgumentError, "Email delivery is not configured yet" unless EmailDelivery.configured?
    unless current_user.email_verified_at
      raw = AccountToken.issue!(current_user, "email_verification")
      AccountEmailJob.perform_later(current_user.id, "email_verification", EmailDelivery.encrypt(raw))
    end
    data({message: "Check your email for a verification link."}, status: :accepted)
  end
end
