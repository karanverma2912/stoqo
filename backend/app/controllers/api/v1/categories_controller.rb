class Api::V1::CategoriesController < ApplicationController
  before_action :require_write!, only: :create
  def index = data(current_business.categories.order(:name))
  def create = data(current_business.categories.create!(params.require(:category).permit(:name, :description)), status: :created)
end
