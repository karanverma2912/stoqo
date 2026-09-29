class Api::V1::ActivitiesController < ApplicationController
  def index
    scope = current_business.activities
    unless BusinessPolicy.new(pundit_user, current_business).report?
      scope = scope.where("action NOT IN (?) OR user_id = ?", %w[bill_created bill_returned], current_user.id)
    end
    rows, meta = paginated(scope.includes(:user).order(created_at: :desc, id: :desc))
    data(rows.map { |a| a.as_json.merge(user_name: a.user.name) }, meta: meta)
  end
end
