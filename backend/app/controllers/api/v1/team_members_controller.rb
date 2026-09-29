class Api::V1::TeamMembersController < ApplicationController
  before_action :manage!
  def index
    data({members: current_business.business_memberships.includes(:user).map { |m| {id: m.id, role: m.role, user: user_json(m.user)} },
      invitations: current_business.team_invitations.pending.as_json(only: [:id, :email, :role, :expires_at]),
      member_limit: current_business.subscription_plan.member_limit})
  end
  def destroy
    current_business.with_lock do
      member = current_business.business_memberships.find(params[:id])
      raise Pundit::NotAuthorizedError if member.role == "owner" || member.user_id == current_user.id
      name = member.user.name
      member.destroy!
      current_business.activities.create!(user: current_user, action: "employee_removed", subject_name: name)
    end
    data({removed: true})
  end
  private
  def manage! = authorize(current_business, :manage?, policy_class: BusinessPolicy)
end
