class Api::V1::AccountSecurityController < ApplicationController
  def show
    data({active_sessions: current_user.sessions.where("expires_at > ?", Time.current).count})
  end

  def change_password
    token = nil
    current_user.with_lock do
      verify_password!
      password = params.require(:password).to_s
      confirmation = params.require(:password_confirmation).to_s
      raise ArgumentError, "Choose a password different from your current password" if current_user.authenticate(password)
      current_user.update!(password: password, password_confirmation: confirmation)
      current_user.sessions.delete_all
      token = Session.issue!(current_user)
    end
    data({token: token, message: "Password changed. Other sessions have been signed out."})
  end

  def revoke_other_sessions
    current_user.with_lock do
      verify_password!
      current_user.sessions.where.not(id: @session.id).delete_all
    end
    data({message: "Other sessions have been signed out."})
  end

  private

  def verify_password!
    # Recheck after obtaining the lock: another password change may have revoked
    # the session since the controller's authentication callback ran.
    raise Pundit::NotAuthorizedError unless current_user.sessions.where("expires_at > ?", Time.current).exists?(@session.id)
    raise ArgumentError, "Your current password is incorrect" unless current_user.authenticate(params.require(:current_password).to_s)
  end
end
