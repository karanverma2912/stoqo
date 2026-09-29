require "rails_helper"
RSpec.describe "Business isolation", type: :request do
  let(:user) { create(:user) }
  let(:business) { create(:business) }
  let!(:membership) { create(:business_membership, user: user, business: business) }
  let(:other) { create(:business) }
  let!(:foreign_product) { create(:product, business: other, name: "Private product") }
  let(:headers) { {"Authorization" => "Bearer #{Session.issue!(user)}", "X-Business-Id" => business.id.to_s} }
  it "requires authentication" do
    get "/api/v1/products"
    expect(response).to have_http_status(:unauthorized)
  end
  it "rejects switching the header to an unowned business" do
    get "/api/v1/products", headers: headers.merge("X-Business-Id" => other.id.to_s)
    expect(response).to have_http_status(:not_found)
  end
  it "scopes lists, dashboard, reports and exports" do
    %w[products dashboard reports activities stock_movements notifications].each do |path|
      get "/api/v1/#{path}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include("Private product")
    end
    get "/api/v1/products/export", headers: headers
    expect(response.body).not_to include("Private product")
  end
  it "rejects guessed foreign product ids for reads, edits and stock changes" do
    get "/api/v1/products/#{foreign_product.id}", headers: headers
    expect(response).to have_http_status(:not_found)
    patch "/api/v1/products/#{foreign_product.id}", params: {product: {name: "hacked"}}, headers: headers, as: :json
    expect(response).to have_http_status(:not_found)
    post "/api/v1/stock_movements", params: {stock_movement: {product_id: foreign_product.id, quantity: 5, movement_type: "stock_in", idempotency_key: "test"}}, headers: headers, as: :json
    expect(response).to have_http_status(:not_found)
    expect(foreign_product.reload.current_stock).to eq(0)
  end
  it "rejects a category from another business" do
    category = other.categories.create!(name: "Private")
    post "/api/v1/products", params: {product: {name: "Test", category_id: category.id}}, headers: headers, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end
  it "does not allow quantity writes through product parameters" do
    post "/api/v1/products", params: {product: {name: "Test", current_stock: 999}}, headers: headers, as: :json
    expect(response).to have_http_status(:created)
    expect(business.products.last.current_stock).to eq(0)
  end
  it "allows staff to register a new product but rejects editing existing products" do
    membership.update!(role: "staff")
    post "/api/v1/products", params: {product: {name: "Test"}}, headers: headers, as: :json
    expect(response).to have_http_status(:created)
    patch "/api/v1/products/#{business.products.last.id}", params: {product: {name: "Changed"}}, headers: headers, as: :json
    expect(response).to have_http_status(:forbidden)
  end
  it "keeps expired trials readable but rejects writes" do
    business.update!(trial_ends_at: 1.day.ago)
    get "/api/v1/products", headers: headers
    expect(response).to have_http_status(:ok)
    post "/api/v1/products", params: {product: {name: "Test"}}, headers: headers, as: :json
    expect(response).to have_http_status(:payment_required)
  end
end
