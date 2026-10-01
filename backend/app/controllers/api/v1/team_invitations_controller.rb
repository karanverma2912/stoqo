class Api::V1::TeamInvitationsController < ApplicationController
  before_action :require_write!, only: :create
  def create
    authorize current_business, :manage?, policy_class: BusinessPolicy
    token = SecureRandom.urlsafe_base64(32)
    invitation = nil
    current_business.with_lock do
      actor = management_actor!
      attributes = params.require(:invitation).permit(:email, :role)
      raise Pundit::NotAuthorizedError if attributes[:role] == "admin" && actor.role != "owner"
      email = attributes[:email].to_s.strip.downcase
      raise ArgumentError, "This email is already on your team" if current_business.business_memberships.joins(:user).exists?(users: {email: email})
      raise ArgumentError, "An invitation is already pending for this email" if current_business.team_invitations.pending.exists?(email: email)
      seats = current_business.business_memberships.count + current_business.team_invitations.pending.count
      raise ArgumentError, "Your plan's user limit has been reached" if seats >= current_business.subscription_plan.member_limit
      invitation = current_business.team_invitations.create!(attributes.merge(token_digest: Digest::SHA256.hexdigest(token), expires_at: 7.days.from_now))
      current_business.activities.create!(user: current_user, action: "employee_invited", subject_name: invitation.email)
    end
    data({id: invitation.id, token: token, email: invitation.email, expires_at: invitation.expires_at}, status: :created)
  end
  def destroy
    authorize current_business, :manage?, policy_class: BusinessPolicy
    current_business.with_lock do
      actor = management_actor!
      invitation = current_business.team_invitations.pending.find(params[:id])
      raise Pundit::NotAuthorizedError if invitation.role == "admin" && actor.role != "owner"
      invitation.update!(revoked_at: Time.current)
      current_business.activities.create!(user: current_user, action: "invitation_revoked", subject_name: invitation.email)
    end
    data({revoked: true})
  end
  def accept
    invitation = TeamInvitation.find_by!(token_digest: Digest::SHA256.hexdigest(params.require(:token).to_s))
    business = invitation.business
    business.with_lock do
      invitation.reload
      raise ArgumentError, "This invitation has expired or is no longer available" if invitation.accepted_at || invitation.revoked_at || invitation.expires_at <= Time.current
      raise Pundit::NotAuthorizedError unless current_user.email == invitation.email
      raise ArgumentError, "This business cannot add users until its subscription is active" unless business.writable?
      raise ArgumentError, "Your plan's user limit has been reached" if business.business_memberships.count >= business.subscription_plan.member_limit
      business.business_memberships.create!(user: current_user, role: invitation.role)
      invitation.update!(accepted_at: Time.current)
      business.activities.create!(user: current_user, action: "employee_joined", subject_name: current_user.name)
    end
    data({business_id: business.id})
  end
  private

  def management_actor!
    actor = current_business.business_memberships.find_by!(user: current_user)
    raise Pundit::NotAuthorizedError unless %w[owner admin].include?(actor.role)
    actor
  end
end
