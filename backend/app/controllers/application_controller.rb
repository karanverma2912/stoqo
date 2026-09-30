class ApplicationController < ActionController::API
  include Pundit::Authorization
  before_action :authenticate!
  rescue_from ActiveRecord::RecordNotFound do
    error("not_found", "This item could not be found", :not_found)
  end
  rescue_from ActiveRecord::RecordInvalid do |e|
    error("validation_error", "Please check the highlighted details", :unprocessable_entity, e.record.errors.to_hash)
  end
  rescue_from ActiveRecord::RecordNotUnique do
    error("conflict", "This value is already in use", :conflict)
  end
  rescue_from ActionController::ParameterMissing do |e|
    error("validation_error", e.message, :unprocessable_entity)
  end
  rescue_from Inventory::AdjustStock::InvalidMovement, ArgumentError do |e|
    error("validation_error", e.message, :unprocessable_entity)
  end
  rescue_from Pundit::NotAuthorizedError do
    error("forbidden", "You do not have permission to do that", :forbidden)
  end
  private
  def authenticate!
    token = request.authorization.to_s.delete_prefix("Bearer ")
    @session = Session.includes(:user).find_by(token_digest: Digest::SHA256.hexdigest(token)) if token.present?
    @current_user = @session&.user if @session && @session.expires_at > Time.current
    error("unauthorized", "Please sign in to continue", :unauthorized) unless @current_user&.status == "active"
  end
  def current_user = @current_user
  def current_business
    @current_business ||= begin
      @membership = current_user.business_memberships.find_by!(business_id: request.headers["X-Business-Id"])
      @membership.business
    end
  end
  def pundit_user
    current_business
    @membership
  end
  def require_stock!
    require_write!(:stock?)
  end
  def require_write!(permission = :write?)
    authorize current_business, permission, policy_class: BusinessPolicy
    error("subscription_expired", "Your subscription is read-only. Your inventory remains available; ask the owner to review the plan.", :payment_required) unless current_business.writable?
  end
  def data(value, meta: {}, status: :ok) = render(json: {data: value, meta: meta}, status: status)
  def error(code, message, status, details = {}) = render(json: {error: {code: code, message: message, details: details}}, status: status)
  def paginated(scope)
    page = [params.fetch(:page, 1).to_i, 1].max
    per = params.fetch(:per_page, 25).to_i.clamp(1, 100)
    total = scope.count
    [scope.limit(per).offset((page - 1) * per), {page: page, per_page: per, total: total, pages: (total.to_f / per).ceil}]
  end
  def user_json(user) = user.as_json(only: [:id, :name, :email])
  def product_json(product)
    product.as_json.except("business_id").merge("display_name" => product.display_name, "stock_status" => product.stock_status, "category_name" => product.category&.name,
      "image_url" => product.image.attached? ? "/api/backend/products/#{product.id}/image?business_id=#{product.business_id}" : nil)
  end
  def movement_json(movement)
    movement.as_json.except("business_id", "idempotency_key").merge("product_name" => movement.product.display_name, "user_name" => movement.user.name)
  end
end
