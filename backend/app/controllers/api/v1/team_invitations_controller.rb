class Api::V1::TeamInvitationsController < ApplicationController
  before_action :require_write!, only: :create
  def create
    authorize current_business, :manage?, policy_class: BusinessPolicy
    result = Team::Invite.call(business: current_business, user: current_user, attributes: params.require(:invitation).permit(:email, :role))
    data(result, status: :created)
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
      current_user.update!(email_verified_at: Time.current) unless current_user.email_verified_at
      business.notifications.create!(kind: "employee_joined", message: "#{current_user.name} joined your team")
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
