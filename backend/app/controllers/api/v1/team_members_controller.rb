class Api::V1::TeamMembersController < ApplicationController
  def index
    authorize current_business, :manage?, policy_class: BusinessPolicy
    data(current_business.business_memberships.includes(:user).map { |m| {id: m.id, role: m.role, user: user_json(m.user)} })
  end
end
