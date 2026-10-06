class Api::V1::SuppliersController < ApplicationController
  before_action { authorize current_business, :write?, policy_class: BusinessPolicy }
  before_action :require_write!, only: [:create, :update]
  def index
    scope = current_business.suppliers.where(archived: params[:archived] == "true")
    scope = scope.where("name ILIKE ?", "%#{Supplier.sanitize_sql_like(params[:q].to_s.first(120))}%") if params[:q].present?
    rows, meta = paginated(scope.order(:name, :id))
    data(rows, meta: meta)
  end
  def create
    save_supplier(current_business.suppliers.new, :created)
  end
  def update
    save_supplier(current_business.suppliers.find(params[:id]), :ok)
  end
  private
  def save_supplier(supplier, status)
    Supplier.transaction do
      supplier.update!(params.require(:supplier).permit(:name, :contact_name, :phone, :email, :notes, :archived))
      current_business.activities.create!(user: current_user, action: status == :created ? "supplier_created" : "supplier_updated", subject_name: supplier.name, details: {supplier_id: supplier.id})
    end
    data(supplier, status: status)
  end
end
