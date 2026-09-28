class Api::V1::ActivitiesController < ApplicationController
  def index
    rows, meta = paginated(current_business.activities.includes(:user).order(created_at: :desc, id: :desc))
    data(rows.map { |a| a.as_json.merge(user_name: a.user.name) }, meta: meta)
  end
end
