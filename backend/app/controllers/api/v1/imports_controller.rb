class Api::V1::ImportsController < ApplicationController
  before_action { authorize current_business, :costs?, policy_class: BusinessPolicy }
  before_action :require_write!, only: :create
  def create
    file = params.require(:file)
    unless file.respond_to?(:original_filename) && %w[.csv .xlsx].include?(File.extname(file.original_filename).downcase) && file.size <= 5.megabytes
      return error("validation_error", "Upload a CSV or XLSX file under 5 MB", :unprocessable_entity)
    end
    import = current_business.imports.create!(user: current_user)
    import.file.attach(file)
    ProductImportJob.perform_later(import.id)
    data(import, status: :accepted)
  end
  def show = data(current_business.imports.find(params[:id]))
end
