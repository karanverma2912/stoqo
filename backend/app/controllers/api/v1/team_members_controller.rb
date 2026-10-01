class Api::V1::TeamMembersController < ApplicationController
  before_action :manage!

  def index
    actor = current_business.business_memberships.find_by!(user: current_user)
    data({members: current_business.business_memberships.includes(:user).order(:id).map { |member|
      allowed = editable?(actor, member)
      {id: member.id, role: member.role, user: user_json(member.user), can_edit: allowed, can_remove: allowed}
    },
      invitations: current_business.team_invitations.pending.order(:id).map { |invitation|
        invitation.as_json(only: [:id, :email, :role, :expires_at]).merge(can_revoke: actor.role == "owner" || invitation.role != "admin")
      },
      role_options: actor.role == "owner" ? %w[staff manager admin] : %w[staff manager],
      member_limit: current_business.subscription_plan.member_limit})
  end

  def update
    current_business.with_lock do
      actor = management_actor!
      member = current_business.business_memberships.find(params[:id])
      raise Pundit::NotAuthorizedError unless editable?(actor, member)
      role = params.require(:membership).require(:role).to_s
      raise ArgumentError, "Choose staff, manager or admin" unless %w[staff manager admin].include?(role)
      raise Pundit::NotAuthorizedError if role == "admin" && actor.role != "owner"
      previous_role = member.role
      if previous_role != role
        member.update!(role: role)
        current_business.activities.create!(user: current_user, action: "employee_role_changed", subject_name: "#{member.user.name}: #{previous_role} → #{role}")
      end
      data({id: member.id, role: member.role})
    end
  end

  def destroy
    current_business.with_lock do
      actor = management_actor!
      member = current_business.business_memberships.find(params[:id])
      raise Pundit::NotAuthorizedError unless editable?(actor, member)
      name = member.user.name
      member.destroy!
      current_business.activities.create!(user: current_user, action: "employee_removed", subject_name: name)
    end
    data({removed: true})
  end

  private

  def manage! = authorize(current_business, :manage?, policy_class: BusinessPolicy)

  def management_actor!
    actor = current_business.business_memberships.find_by!(user: current_user)
    raise Pundit::NotAuthorizedError unless %w[owner admin].include?(actor.role)
    actor
  end

  def editable?(actor, member)
    member.role != "owner" && member.user_id != current_user.id && (actor.role == "owner" || member.role != "admin")
  end
end
