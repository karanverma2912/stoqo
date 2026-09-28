class Api::V1::AuthController < ApplicationController
  skip_before_action :authenticate!, only: [:signup, :login]
  def signup
    user = User.create!(params.require(:user).permit(:name, :email, :password, :password_confirmation))
    data({user: user_json(user), token: Session.issue!(user)}, status: :created)
  end
  def login
    user = User.find_by(email: params[:email].to_s.strip.downcase)
    if user&.authenticate(params[:password].to_s) && user.status == "active"
      data({user: user_json(user), token: Session.issue!(user)})
    else
      error("invalid_credentials", "Email or password is incorrect", :unauthorized)
    end
  end
  def me = data(user_json(current_user))
  def logout
    @session.destroy!
    head :no_content
  end
end
